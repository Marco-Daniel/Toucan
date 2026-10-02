// import libraries
import { spawn } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// import utils
import {
  SYSTEM_PATH,
  fakeQmd,
  qmdEnv,
  readQmdLog,
  until,
  writeCacheFile,
} from "../../helpers/qmd.ts";

const SCRIPT = new URL("../../../scripts/qmd/docs-index.mts", import.meta.url).pathname;

let dir: string;
let lock: string;
let pending: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "toucan-docs-index-"));
  // qmd's cache folder, where the lock lives: this test's own, never the real one.
  lock = join(dir, "qmd", "toucan.lock");
  pending = join(dir, "qmd", "toucan.pending");
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

interface Exit {
  code: number | null;
  stdout: string;
  stderr: string;
}

interface DocsIndexArgs {
  path: string;
  extra?: Record<string, string>;
}

/** Starts `pnpm docs:index` as a child, with only the fake qmd and this test's dir for home and cache. */
function docsIndex({ path, extra = {} }: DocsIndexArgs): Promise<Exit> {
  const child = spawn(process.execPath, [SCRIPT], {
    env: { ...qmdEnv({ dir, path }), ...extra },
    stdio: ["ignore", "pipe", "pipe"],
    // A run that hangs (a broken lock, say) is killed and fails, not left hanging.
    timeout: 10_000,
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk: Buffer) => (stdout += chunk.toString()));
  child.stderr.on("data", (chunk: Buffer) => (stderr += chunk.toString()));
  return new Promise((resolve) => child.on("close", (code) => resolve({ code, stdout, stderr })));
}

const lines = () => {
  const log = readQmdLog(dir);
  return log === "" ? [] : log.trim().split("\n");
};

/** Starts docs:index with the update held open and a fast heartbeat; resolves once the update runs. */
async function slowUpdate(): Promise<{ exit: Promise<Exit> }> {
  writeFileSync(join(dir, "hold"), "");
  const exit = docsIndex({ path: fakeQmd({ dir }), extra: { TOUCAN_QMD_HEARTBEAT_MS: "50" } });
  await until(() => lines().includes("update start"));
  // Wrapped: an async function returning `exit` itself would wait for it.
  return { exit };
}

/** Holds the lock as another job would. */
function holdLock(): void {
  writeCacheFile({ dir, name: "toucan.lock", text: "another job" });
}

describe("pnpm docs:index", () => {
  it("runs every qmd call on Toucan's own index", async () => {
    expect(await docsIndex({ path: fakeQmd({ dir }) })).toMatchObject({ code: 0 });
    const log = lines();
    expect(log.filter((line) => line.startsWith("wrong index"))).toEqual([]);
    // It did run the whole plan, on the right index.
    expect(log.filter((line) => line === "collection add")).toHaveLength(2);
    expect(log.slice(-3)).toEqual(["update start", "update end", "embed"]);
  });

  it("waits for a job holding the lock, then runs", async () => {
    holdLock();
    const exit = docsIndex({ path: fakeQmd({ dir, tag: lock }) });
    await until(() => lines().includes("version @another job"));
    // Hold it through a few of its retries (every 250 ms). How long only decides whether a
    // broken wait gets caught: every call is tagged with the lock it ran under, below.
    await new Promise((resolve) => setTimeout(resolve, 600));
    rmSync(lock);
    expect(await exit).toMatchObject({ code: 0 });
    const log = lines();
    // Nothing but the install check ran while the other job held the lock...
    expect(log.filter((line) => line.endsWith("@another job"))).toEqual(["version @another job"]);
    // ...and the whole plan ran under its own lock afterwards.
    expect(log.slice(-3)).toEqual(["update start @", "update end @", "embed @"]);
  });

  it("re-indexes once more for an edit noted while it ran", async () => {
    writeCacheFile({ dir, name: "toucan.pending", text: "" });
    expect(await docsIndex({ path: fakeQmd({ dir }) })).toMatchObject({ code: 0 });
    expect(lines().slice(-5)).toEqual([
      "update start",
      "update end",
      "embed",
      "update start",
      "update end",
    ]);
    expect(existsSync(pending)).toBe(false);
  });

  it("lets go of the lock when it's done", async () => {
    expect(await docsIndex({ path: fakeQmd({ dir }) })).toMatchObject({ code: 0 });
    // It did take it: the cache folder is there, the lock isn't.
    expect([existsSync(join(dir, "qmd")), existsSync(lock)]).toEqual([true, false]);
  });

  it("gives up when the lock stays held", async () => {
    holdLock();
    const exit = await docsIndex({ path: fakeQmd({ dir }), extra: { TOUCAN_QMD_WAIT_MS: "300" } });
    expect(exit.code).toBe(1);
    expect(exit.stderr).toContain("Try again in a minute.");
    expect(lines()).toEqual(["version"]);
    expect(readFileSync(lock, "utf8")).toBe("another job");
  });

  it("says how to install qmd when it's missing", async () => {
    const exit = await docsIndex({ path: SYSTEM_PATH });
    expect(exit.code).toBe(1);
    expect(exit.stderr).toContain("qmd isn't installed.");
    expect(existsSync(join(dir, "qmd"))).toBe(false);
  });

  it("keeps its lock fresh while a qmd command runs long", async () => {
    const { exit } = await slowUpdate();
    const halfAnHourAgo = new Date(Date.now() - 30 * 60_000);
    utimesSync(lock, halfAnHourAgo, halfAnHourAgo);
    await until(() => Date.now() - statSync(lock).mtimeMs < 60_000);
    rmSync(join(dir, "hold"));
    expect(await exit).toMatchObject({ code: 0 });
  });

  it("carries on when its lock is removed while it runs", async () => {
    const { exit } = await slowUpdate();
    rmSync(lock);
    // Several heartbeats (every 50 ms) find the lock gone; only how long decides
    // whether a crashing heartbeat gets caught, never whether a correct run passes.
    await new Promise((resolve) => setTimeout(resolve, 300));
    rmSync(join(dir, "hold"));
    const { code, stderr } = await exit;
    expect({ code, stderr }).toEqual({ code: 0, stderr: "" });
    expect(lines().slice(-1)).toEqual(["embed"]);
  });

  it("stops at the first qmd command that fails", async () => {
    const { code, stderr } = await docsIndex({ path: fakeQmd({ dir, failAdd: true }) });
    expect(code).toBe(1);
    expect(stderr).toContain("qmd collection add failed; stopping.");
    const log = lines();
    expect(log.filter((line) => line === "collection add")).toHaveLength(1);
    expect(log.at(-1)).toBe("collection add");
  });
});
