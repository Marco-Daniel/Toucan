// import libraries
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// import utils
import {
  deploy,
  deployStatus,
  isInsideBuild,
  listFiles,
  netlifyApi,
  redact,
  uploadPlan,
} from "../../scripts/netlify.mts";

// import types
import type {
  DeployFile,
  DeployStatus,
  NetlifyPort,
  UploadFileArgs,
} from "../../scripts/netlify.mts";

const FILES: DeployFile[] = [
  { path: "/index.html", sha1: "a1", file: "/b/index.html" },
  { path: "/docs/index.html", sha1: "b2", file: "/b/docs/index.html" },
  { path: "/404.html", sha1: "c3", file: "/b/404.html" },
  { path: "/404/index.html", sha1: "c3", file: "/b/404/index.html" },
];

let dir: string;
let outside: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "toucan-netlify-"));
  outside = mkdtempSync(join(tmpdir(), "toucan-netlify-outside-"));
});
// Here rather than in the tests, so a failing assertion still cleans up.
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
  rmSync(outside, { recursive: true, force: true });
});

describe("listFiles", () => {
  it("lists every file under the root with its site path and SHA-1", () => {
    mkdirSync(join(dir, "docs"));
    writeFileSync(join(dir, "index.html"), "home");
    writeFileSync(join(dir, "docs", "index.html"), "docs");
    expect(
      listFiles(dir)
        .map(({ path, sha1 }) => `${path} ${sha1}`)
        .toSorted(),
    ).toEqual([
      "/docs/index.html 71ab8b6afb1bae3df247e0286da35e0da16564ff",
      "/index.html e83249bd3ba79932e16fb1fb5100dafade9954c2",
    ]);
  });

  it("refuses a symlink, so nothing outside the build can be read", () => {
    writeFileSync(join(outside, "secret"), "x");
    writeFileSync(join(dir, "index.html"), "home");
    symlinkSync(join(outside, "secret"), join(dir, "leak.txt"));
    expect(() => listFiles(dir)).toThrow("Refusing to deploy a symlink: leak.txt");
  });

  it("refuses a symlinked folder too", () => {
    symlinkSync(outside, join(dir, "assets"));
    expect(() => listFiles(dir)).toThrow("Refusing to deploy a symlink: assets");
  });
});

describe("isInsideBuild", () => {
  it.each([
    ["index.html", true],
    ["docs/index.html", true],
    ["..hidden.html", false],
    ["../secret", false],
    ["..", false],
    ["", false],
    ["/etc/passwd", false],
  ])("%j: %s", (path, expected) => {
    expect(isInsideBuild(path)).toBe(expected);
  });
});

describe("uploadPlan", () => {
  it("uploads each requested digest once, from a file that has it", () => {
    expect(uploadPlan({ files: FILES, required: ["c3", "a1"] }).map(({ path }) => path)).toEqual([
      "/404.html",
      "/index.html",
    ]);
  });

  it("uploads nothing when Netlify has every file already", () => {
    expect(uploadPlan({ files: FILES, required: [] })).toEqual([]);
  });

  it("throws when Netlify asks for a file this build doesn't have", () => {
    expect(() => uploadPlan({ files: FILES, required: ["a1", "zz", "yy"] })).toThrow(
      "Netlify asked for 2 file(s) this build doesn't have",
    );
  });
});

interface FakeArgs {
  required: string[];
  /** The states getDeploy reports, in turn; the last one repeats. */
  states: string[];
  failUpload?: string;
  errorMessage?: string;
}

/** A Netlify that records what it was sent and answers as seeded. */
function fakeNetlify({ required, states, failUpload, errorMessage }: FakeArgs) {
  const calls: string[] = [];
  let polls = 0;
  const netlify: NetlifyPort = {
    createDeploy: (digests) => {
      calls.push(`create ${Object.keys(digests).length}`);
      return Promise.resolve({ id: "d1", state: "uploading", required });
    },
    uploadFile: ({ deployId, path, bytes }: UploadFileArgs) => {
      calls.push(`upload ${deployId} ${path} ${new TextDecoder().decode(bytes)}`);
      return path === failUpload
        ? Promise.reject(new Error(`upload of ${path} failed`))
        : Promise.resolve();
    },
    getDeploy: (deployId) => {
      const state = states[Math.min(polls, states.length - 1)] ?? "ready";
      polls++;
      calls.push(`poll ${deployId} ${state}`);
      const status: DeployStatus = { id: deployId, state, required: [] };
      return Promise.resolve(errorMessage === undefined ? status : { ...status, errorMessage });
    },
  };
  return { netlify, calls };
}

/** A clock that moves a second each wait. */
function fakeClock() {
  let time = 0;
  return {
    now: () => time,
    wait: (ms: number) => {
      time += ms;
      return Promise.resolve();
    },
  };
}

const read = (file: string) => new TextEncoder().encode(`bytes of ${file}`);
const quiet = () => undefined;

describe("deploy", () => {
  it("announces every file, uploads only what Netlify asks for, then polls until ready", async () => {
    const { netlify, calls } = fakeNetlify({ required: ["b2"], states: ["processing", "ready"] });
    const status = await deploy({
      files: FILES,
      netlify,
      read,
      ...fakeClock(),
      pollMs: 1000,
      log: quiet,
    });
    expect(status.state).toBe("ready");
    expect(calls).toEqual([
      "create 4",
      "upload d1 /docs/index.html bytes of /b/docs/index.html",
      "poll d1 processing",
      "poll d1 ready",
    ]);
  });

  it("reads the files from disk by default, and says how much it uploads", async () => {
    writeFileSync(join(dir, "index.html"), "home");
    const [file] = listFiles(dir);
    const { netlify, calls } = fakeNetlify({
      required: file === undefined ? [] : [file.sha1],
      states: ["ready"],
    });
    const logged: string[] = [];
    await deploy({
      files: listFiles(dir),
      netlify,
      ...fakeClock(),
      log: (message) => logged.push(message),
    });
    expect(calls).toEqual(["create 1", "upload d1 /index.html home", "poll d1 ready"]);
    expect(logged).toEqual(["Deploy d1: 1 files, 1 to upload"]);
  });

  it("stops before polling when an upload fails, so a partial deploy never goes live", async () => {
    const { netlify, calls } = fakeNetlify({
      required: ["a1", "b2"],
      states: ["ready"],
      failUpload: "/index.html",
    });
    await expect(
      deploy({ files: FILES, netlify, read, ...fakeClock(), log: quiet }),
    ).rejects.toThrow("upload of /index.html failed");
    expect(calls).toEqual(["create 4", "upload d1 /index.html bytes of /b/index.html"]);
  });

  it("uploads nothing and fails when Netlify asks for a file the build doesn't have", async () => {
    const { netlify, calls } = fakeNetlify({ required: ["a1", "nope"], states: ["ready"] });
    await expect(
      deploy({ files: FILES, netlify, read, ...fakeClock(), log: quiet }),
    ).rejects.toThrow("Netlify asked for 1 file(s) this build doesn't have");
    expect(calls).toEqual(["create 4"]);
  });

  it("fails with Netlify's reason when the deploy ends in the error state", async () => {
    const { netlify } = fakeNetlify({
      required: [],
      states: ["processing", "error"],
      errorMessage: "Build too large",
    });
    await expect(
      deploy({ files: FILES, netlify, read, ...fakeClock(), pollMs: 1000, log: quiet }),
    ).rejects.toThrow("Deploy d1 failed: Build too large");
  });

  it("says so when Netlify gives no reason for the error", async () => {
    const { netlify } = fakeNetlify({ required: [], states: ["error"] });
    await expect(
      deploy({ files: FILES, netlify, read, ...fakeClock(), log: quiet }),
    ).rejects.toThrow("Deploy d1 failed: no reason given");
  });

  it("gives up after the timeout when the deploy never gets ready", async () => {
    const { netlify, calls } = fakeNetlify({ required: [], states: ["processing"] });
    await expect(
      deploy({
        files: FILES,
        netlify,
        read,
        ...fakeClock(),
        pollMs: 1000,
        timeoutMs: 3000,
        log: quiet,
      }),
    ).rejects.toThrow("Deploy d1 wasn't ready after 3 s (still processing)");
    expect(calls.filter((call) => call.startsWith("poll"))).toHaveLength(4);
  });
});

describe("deployStatus", () => {
  it("reads the id, state, required digests and error message", () => {
    expect(
      deployStatus({
        id: "d1",
        state: "error",
        required: ["a", 5, "b"],
        error_message: "No",
        extra: true,
      }),
    ).toEqual({ id: "d1", state: "error", required: ["a", "b"], errorMessage: "No" });
    expect(deployStatus({ id: "d1", state: "ready" })).toEqual({
      id: "d1",
      state: "ready",
      required: [],
    });
  });

  it("leaves out an error message that isn't text", () => {
    expect(deployStatus({ id: "d1", state: "error", error_message: 5 })).toEqual({
      id: "d1",
      state: "error",
      required: [],
    });
  });

  it("throws on an answer without an id or a state", () => {
    expect(() => deployStatus({ state: "ready" })).toThrow(
      "Netlify answered without a deploy id and state",
    );
    expect(() => deployStatus({ id: "d1" })).toThrow(
      "Netlify answered without a deploy id and state",
    );
    expect(() => deployStatus("<html>")).toThrow("Netlify answered without a deploy id and state");
  });
});

describe("redact", () => {
  it("removes every copy of the token", () => {
    expect(redact({ text: "a tok-123 b tok-123", token: "tok-123" })).toBe(
      "a [redacted] b [redacted]",
    );
    expect(redact({ text: "a b", token: "" })).toBe("a b");
  });
});

/** A fetch that records each request and answers with the next response. */
function fakeFetch(answers: (Response | Error)[]) {
  const requests: {
    url: string;
    method: string;
    auth: string | null;
    type: string | null;
    body: unknown;
  }[] = [];
  const fetchFn = ((url: string, init: RequestInit) => {
    requests.push({
      url,
      method: init.method ?? "",
      auth: new Headers(init.headers).get("authorization"),
      type: new Headers(init.headers).get("content-type"),
      body: init.body,
    });
    const answer = answers.shift() ?? new Error("no answer");
    return answer instanceof Error ? Promise.reject(answer) : Promise.resolve(answer);
  }) as typeof fetch;
  return { fetchFn, requests };
}

describe("netlifyApi", () => {
  const TOKEN = "secret-token-value";

  it("creates the deploy with the digests and the token, and reads Netlify's answer", async () => {
    const { fetchFn, requests } = fakeFetch([
      Response.json({ id: "d1", state: "uploading", required: ["a1"] }),
    ]);
    const api = netlifyApi({ token: TOKEN, siteId: "site-1", fetchFn });
    expect(await api.createDeploy({ "/index.html": "a1" })).toEqual({
      id: "d1",
      state: "uploading",
      required: ["a1"],
    });
    expect(requests).toEqual([
      {
        url: "https://api.netlify.com/api/v1/sites/site-1/deploys",
        method: "POST",
        auth: `Bearer ${TOKEN}`,
        type: "application/json",
        body: '{"files":{"/index.html":"a1"}}',
      },
    ]);
  });

  it("uploads a file to its encoded path", async () => {
    const { fetchFn, requests } = fakeFetch([new Response(null, { status: 200 })]);
    const bytes = new Uint8Array([1, 2]);
    await netlifyApi({ token: TOKEN, siteId: "site-1", fetchFn }).uploadFile({
      deployId: "d1",
      path: "/docs/a b.html",
      bytes,
    });
    expect(requests.map(({ url, method, type, body }) => ({ url, method, type, body }))).toEqual([
      {
        url: "https://api.netlify.com/api/v1/deploys/d1/files/docs/a%20b.html",
        method: "PUT",
        type: "application/octet-stream",
        body: bytes,
      },
    ]);
  });

  it("reads a deploy's status with a GET that sends no body", async () => {
    const { fetchFn, requests } = fakeFetch([Response.json({ id: "d1", state: "ready" })]);
    expect(await netlifyApi({ token: TOKEN, siteId: "site-1", fetchFn }).getDeploy("d1")).toEqual({
      id: "d1",
      state: "ready",
      required: [],
    });
    expect(requests.map(({ url, method, type, body }) => ({ url, method, type, body }))).toEqual([
      {
        url: "https://api.netlify.com/api/v1/deploys/d1",
        method: "GET",
        type: "application/json",
        body: undefined,
      },
    ]);
  });

  it("fails on a non-2xx answer with the method, endpoint and status, and nothing of the body", async () => {
    const { fetchFn } = fakeFetch([
      new Response(`{"message":"bad","token":"${TOKEN}"}`, { status: 401 }),
    ]);
    await expect(
      netlifyApi({ token: TOKEN, siteId: "site-1", fetchFn }).getDeploy("d1"),
    ).rejects.toThrow(/^Netlify GET \/deploys\/d1 answered 401$/);
  });

  it("redacts the token from a network error that echoes it", async () => {
    const { fetchFn } = fakeFetch([new Error(`connect failed for Bearer ${TOKEN}`)]);
    const failure = netlifyApi({ token: TOKEN, siteId: "site-1", fetchFn }).getDeploy("d1");
    await expect(failure).rejects.toThrow(
      "Netlify GET /deploys/d1 failed: Error: connect failed for Bearer [redacted]",
    );
    await expect(failure).rejects.not.toThrow(TOKEN);
  });

  it("refuses a site id that could change the endpoint", () => {
    for (const siteId of ["../accounts", "site-1/../../accounts", ""]) {
      expect(() => netlifyApi({ token: TOKEN, siteId, fetchFn: fetch })).toThrow(
        "NETLIFY_SITE_ID isn't a Netlify site id",
      );
    }
  });
});
