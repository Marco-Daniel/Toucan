import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  SYSTEM_PATH,
  fakeQmd,
  qmdEnv,
  readQmdLog,
  runWorker,
  startWorker,
  until,
  writeCacheFile,
  stopWorkers,
} from "../../helpers/qmd.ts";

const HOOK = new URL("../../../scripts/qmd/docs-bootstrap-hook.mts", import.meta.url).pathname;

let dir: string;
let cache: string;
let lock: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "toucan-bootstrap-"));
  cache = join(dir, "qmd");
  lock = join(cache, "toucan.lock");
});
afterEach(() => {
  stopWorkers({ script: HOOK, home: dir });
  rmSync(dir, { recursive: true, force: true });
});

// qmd's cache, and so the lock, in this test's dir: never the real one.
const env = (path: string) => qmdEnv({ dir, path });

/** Runs the hook as Claude Code would at session start: it hands off to a detached worker. */
function start(path: string) {
  return spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ hook_event_name: "SessionStart", source: "startup" }),
    env: env(path),
    encoding: "utf8",
    timeout: 10_000,
  });
}

/** Runs the worker itself and waits for it, so its outcome is known when this returns. */
function work(path: string) {
  return runWorker({ script: HOOK, env: env(path) });
}

const read = () => readQmdLog(dir);
const steps = (log: string) => log.trim().split("\n");

describe("the docs bootstrap hook", () => {
  it("returns at once and leaves the work to a detached worker", async () => {
    expect(start(fakeQmd({ dir }))).toMatchObject({ status: 0, stdout: "", stderr: "" });
    // Done means the last update has ended and the lock is let go.
    await until(() => read().includes("update end") && !existsSync(lock));
    const log = steps(read());
    expect(log.filter((step) => step === "collection add")).toHaveLength(2);
    expect(log.slice(-2)).toEqual(["update start", "update end"]);
  });
});

describe("the docs bootstrap worker", () => {
  it("registers Toucan's collections and builds the keyword index when there are none", () => {
    expect(work(fakeQmd({ dir }))).toMatchObject({ status: 0, stdout: "", stderr: "" });
    const log = steps(read());
    expect(log.slice(0, 4)).toEqual([
      "version",
      "collection list",
      "collection show",
      "collection show",
    ]);
    expect(log.filter((step) => step === "collection add")).toHaveLength(2);
    expect(log.slice(-2)).toEqual(["update start", "update end"]);
    expect(log.some((step) => step.startsWith("embed"))).toBe(false);
    expect(existsSync(lock)).toBe(false);
  });

  it("finishes registering when only some of the collections are there", () => {
    work(fakeQmd({ dir, collections: "'toucan-docs (qmd://toucan-docs/)'" }));
    expect(steps(read()).filter((step) => step === "collection add")).toHaveLength(2);
  });

  it("does nothing more once all of Toucan's collections are registered", () => {
    work(
      fakeQmd({
        dir,
        collections: "'toucan-docs (qmd://toucan-docs/)' 'toucan-guides (qmd://toucan-guides/)'",
      }),
    );
    expect(read()).toBe("version\ncollection list\n");
  });

  it("stops at the first qmd command that fails", () => {
    work(fakeQmd({ dir, failAdd: true }));
    const log = steps(read());
    expect(log.filter((step) => step === "collection add")).toHaveLength(1);
    expect(log.some((step) => step.startsWith("update"))).toBe(false);
  });

  it("stays silent without qmd, and lets go of the lock", () => {
    expect(work(SYSTEM_PATH)).toMatchObject({ status: 0, stdout: "", stderr: "" });
    expect(read()).toBe("");
    // It did take the lock (taking it makes the folder), and let it go.
    expect([existsSync(cache), existsSync(lock)]).toEqual([true, false]);
  });

  it("waits for a qmd job that's already running, then registers", async () => {
    writeCacheFile({ dir, name: "toucan.lock", text: "" });
    const exited = startWorker({ script: HOOK, env: env(fakeQmd({ dir })) });
    // Longer than the worker takes to start and find the lock taken: one that
    // didn't wait would be gone by now, with nothing registered.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    expect(read()).toBe("");
    rmSync(lock);
    expect(await exited).toBe(0);
    expect(steps(read()).filter((step) => step === "collection add")).toHaveLength(2);
  });
});
