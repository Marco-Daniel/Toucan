import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isPending,
  markPending,
  releaseLock,
  takeLock,
  takePending,
  touchLock,
} from "../../scripts/qmd-lock.mts";

let dir: string;
let cache: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "toucan-lock-"));
  // qmd's cache, and so the lock, in this test's dir: never the real one.
  vi.stubEnv("XDG_CACHE_HOME", dir);
  cache = join(dir, "qmd");
});
afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(dir, { recursive: true, force: true });
});

function age(path: string, ms: number): void {
  const then = new Date(Date.now() - ms);
  utimesSync(path, then, then);
}

describe("the qmd lock", () => {
  it("lives in qmd's cache folder, next to Toucan's index", () => {
    expect(takeLock()).toBe(join(cache, "toucan.lock"));
  });

  it("is held by one job at a time", () => {
    const lock = takeLock()!;
    expect(takeLock()).toBeUndefined();
    releaseLock(lock);
    expect(takeLock()).toBe(lock);
  });

  it("takes over a lock older than ten minutes, never a fresher one", () => {
    const lock = takeLock()!;
    age(lock, 9 * 60_000);
    expect(takeLock()).toBeUndefined();
    age(lock, 11 * 60_000);
    expect(takeLock()).toBe(lock);
  });

  it("lets a long job keep its lock fresh", () => {
    const lock = takeLock()!;
    age(lock, 30 * 60_000);
    touchLock(lock);
    expect(takeLock()).toBeUndefined();
  });

  it("notes pending edits until they're taken", () => {
    expect(markPending()).toBe(true);
    expect(isPending()).toBe(true);
    expect(takePending()).toBe(true);
    expect([isPending(), takePending()]).toEqual([false, false]);
  });
});

/** Plants a symlink at one of the lock files; returns the file it points to. */
function plant(name: string): string {
  mkdirSync(cache, { recursive: true });
  const victim = join(dir, "victim");
  writeFileSync(victim, "keep me");
  symlinkSync(victim, join(cache, name));
  return victim;
}

describe("the lock files, against planted symlinks", () => {
  it("never writes through a symlink at the pending note", () => {
    const victim = plant("toucan.pending");
    expect(markPending()).toBe(false);
    expect(readFileSync(victim, "utf8")).toBe("keep me");
  });

  it("never writes through a symlink at the lock", () => {
    const victim = plant("toucan.lock");
    expect(takeLock()).toBeUndefined();
    expect(readFileSync(victim, "utf8")).toBe("keep me");
  });

  it("removes only the link, never its target, when taking the pending note", () => {
    const victim = plant("toucan.pending");
    expect(takePending()).toBe(true);
    expect([existsSync(victim), lstatSync(victim).isFile()]).toEqual([true, true]);
  });
});
