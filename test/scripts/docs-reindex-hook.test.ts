import { spawn, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SYSTEM_PATH, fakeQmd } from "./fake-qmd.ts";

const HOOK = new URL("../../scripts/docs-reindex-hook.mts", import.meta.url).pathname;
const REGISTERED = "'toucan-docs (qmd://toucan-docs/)'";

let dir: string;
let cache: string;
let lock: string;
let pending: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "toucan-hook-"));
  cache = join(dir, "qmd");
  lock = join(cache, "toucan.lock");
  pending = join(cache, "toucan.pending");
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
});

// qmd's cache, and so the lock, in this test's dir: never the real one.
const env = (path: string) => ({
  PATH: path,
  CLAUDE_PROJECT_DIR: "/repo",
  HOME: dir,
  XDG_CACHE_HOME: dir,
});
const input = (file: unknown) =>
  JSON.stringify({ tool_name: "Edit", tool_input: { file_path: file } });

/** Runs the hook as Claude Code would, with `stdin` as its input. */
function hook(stdin: string, path: string) {
  return spawnSync(process.execPath, [HOOK], { input: stdin, env: env(path), encoding: "utf8" });
}

/**
 * Runs the worker the hook hands off to, and waits for it. The timeout turns a
 * worker that ignores a held lock (and blocks on the held update) into a failure.
 */
function work(path: string) {
  return spawnSync(process.execPath, [HOOK, "--worker"], {
    env: env(path),
    encoding: "utf8",
    timeout: 10_000,
  });
}

/** Notes an edit as the hook does before it hands off. */
function note(): void {
  mkdirSync(cache, { recursive: true });
  writeFileSync(pending, "");
}

const read = () =>
  existsSync(join(dir, "qmd.log")) ? readFileSync(join(dir, "qmd.log"), "utf8") : "";

/** The log once the detached worker is done: the edit taken and the lock released. */
async function done(): Promise<string> {
  await vi.waitFor(
    () => {
      if (!read().includes("update end") || existsSync(lock) || existsSync(pending)) {
        throw new Error("still running");
      }
    },
    { timeout: 5000, interval: 20 },
  );
  return read();
}

describe("the docs re-index hook", () => {
  it("re-indexes Toucan's own index in the background after a docs edit", async () => {
    const result = hook(
      input("/repo/docs/plans/glyph-set/plan.md"),
      fakeQmd(dir, { collections: REGISTERED }),
    );
    expect(result).toMatchObject({ status: 0, stdout: "", stderr: "" });
    expect(await done()).toBe("version\ncollection list\nupdate start\nupdate end\n");
  });

  it("re-indexes after a guide edit", async () => {
    hook(
      input("/repo/README.md"),
      fakeQmd(dir, { collections: "'toucan-guides (qmd://toucan-guides/)'" }),
    );
    expect(await done()).toBe("version\ncollection list\nupdate start\nupdate end\n");
  });

  // The hook notes an edit before it returns, so nothing noted means no worker.
  it("does nothing for a source edit", () => {
    expect(hook(input("/repo/src/core/glyphs.ts"), fakeQmd(dir))).toMatchObject({
      status: 0,
      stdout: "",
    });
    expect(existsSync(cache)).toBe(false);
  });

  it.each([
    ["a non-string file path", input(42)],
    ["empty input", ""],
    ["input that isn't JSON", "not json"],
  ])("ignores %s", (_case, stdin) => {
    expect(hook(stdin, fakeQmd(dir, { collections: REGISTERED }))).toMatchObject({
      status: 0,
      stdout: "",
      stderr: "",
    });
    expect(existsSync(cache)).toBe(false);
  });

  it("stays silent without qmd", () => {
    expect(hook(input("/repo/docs/a.md"), SYSTEM_PATH)).toMatchObject({
      status: 0,
      stdout: "",
      stderr: "",
    });
  });
});

describe("the docs re-index worker", () => {
  it("leaves the edit pending for the bootstrap when Toucan's collections aren't registered", () => {
    note();
    work(fakeQmd(dir, { collections: "'not-toucan-docs (qmd://not-toucan-docs/)'" }));
    expect(read()).toBe("version\ncollection list\n");
    expect([existsSync(pending), existsSync(lock)]).toEqual([true, false]);
  });

  it.each([
    ["without qmd", SYSTEM_PATH],
    ["with an empty PATH", ""],
  ])("stays silent %s, and leaves the edit pending", (_case, path) => {
    note();
    expect(work(path)).toMatchObject({ status: 0, stdout: "", stderr: "" });
    expect(read()).toBe("");
    expect([existsSync(pending), existsSync(lock)]).toEqual([true, false]);
  });

  it("leaves the edit to the job that holds the lock", () => {
    note();
    writeFileSync(lock, "");
    work(fakeQmd(dir, { collections: REGISTERED }));
    expect(read()).toBe("");
    expect([existsSync(pending), existsSync(lock)]).toEqual([true, true]);
  });

  it("takes over a lock left by a job that died", () => {
    note();
    writeFileSync(lock, "");
    const elevenMinutesAgo = new Date(Date.now() - 11 * 60_000);
    utimesSync(lock, elevenMinutesAgo, elevenMinutesAgo);
    work(fakeQmd(dir, { collections: REGISTERED }));
    expect(read()).toBe("version\ncollection list\nupdate start\nupdate end\n");
    expect([existsSync(pending), existsSync(lock)]).toEqual([false, false]);
  });

  it("runs one update at a time and catches up on edits made meanwhile", async () => {
    const path = fakeQmd(dir, { collections: REGISTERED });
    writeFileSync(join(dir, "hold"), "");
    note();
    const first = spawn(process.execPath, [HOOK, "--worker"], { env: env(path), stdio: "ignore" });
    const exited = new Promise((resolve) => first.on("close", resolve));
    await vi.waitFor(
      () => {
        if (!read().includes("update start")) {
          throw new Error("not yet");
        }
      },
      { timeout: 5000, interval: 20 },
    );
    // Five more edits while the first update runs: each worker finds the lock taken.
    for (let i = 0; i < 5; i++) {
      note();
      expect(work(path).status).toBe(0);
    }
    rmSync(join(dir, "hold"));
    expect(await exited).toBe(0);
    // Never two updates at once; the five edits are coalesced into one more.
    expect(
      read()
        .split("\n")
        .filter((line) => line.startsWith("update")),
    ).toEqual(["update start", "update end", "update start", "update end"]);
    expect([existsSync(pending), existsSync(lock)]).toEqual([false, false]);
  });
});
