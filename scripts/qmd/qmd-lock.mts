// One qmd job at a time for Toucan's scripts: concurrent writes to the same
// qmd database fail. The lock and the pending note live in qmd's own per-user
// cache folder, next to Toucan's index, and are created exclusively, which
// never follows a symlink. A lock older than STALE_MS was left by a job that
// died; long jobs refresh theirs.
import {
  closeSync,
  constants,
  lstatSync,
  mkdirSync,
  openSync,
  rmSync,
  statSync,
  utimesSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { tryCatchSync } from "../../src/shared/async/tryCatch.util.ts";

/** A lock older than this (10 minutes) was left by a job that died. */
const STALE_MS = 600_000;
/** The lock and pending files: read and write for this user only. */
const FILE_MODE = 0o600;

/** qmd's cache folder, resolved the way qmd resolves it. */
function cache(name: string): string {
  const dir = join(process.env["XDG_CACHE_HOME"] || join(homedir(), ".cache"), "qmd");
  mkdirSync(dir, { recursive: true });
  return join(dir, name);
}

function create(path: string): boolean {
  const { O_CREAT, O_EXCL, O_WRONLY } = constants;
  const [, error] = tryCatchSync(() =>
    closeSync(openSync(path, O_CREAT | O_EXCL | O_WRONLY, FILE_MODE)),
  );
  return error === null;
}

/** Takes the lock (replacing a stale one) and returns its path, or undefined if held. */
export function takeLock(): string | undefined {
  const lock = cache("toucan.lock");
  // A lock that can't be read isn't there: free.
  tryCatchSync(() => {
    if (Date.now() - statSync(lock).mtimeMs > STALE_MS) {
      rmSync(lock);
    }
  });
  return create(lock) ? lock : undefined;
}

/** Whether a file system error says the file isn't there. */
function isMissing(error: unknown): boolean {
  return error instanceof Error && "code" in error && error.code === "ENOENT";
}

/** Keeps a held lock fresh. One that's gone (removed by hand, say) stays gone. */
export function touchLock(lock: string): void {
  const now = new Date();
  const [, error] = tryCatchSync(() => utimesSync(lock, now, now));
  if (error !== null && !isMissing(error)) {
    throw error;
  }
}

export function releaseLock(lock: string): void {
  rmSync(lock, { force: true });
}

/** Notes an edit, so a running job goes round once more. */
export const markPending = (): boolean => create(cache("toucan.pending"));
/** Whether an edit is noted: only a regular file counts, never a folder or a link. */
export function isPending(): boolean {
  const [stats] = tryCatchSync(() => lstatSync(cache("toucan.pending")));
  return stats?.isFile() ?? false;
}

/**
 * Takes the pending note: `taken`, `none` when there is none, or `stuck` when
 * something is there that can't be removed (a folder, say), so that a caller
 * looping on it stops instead of spinning.
 */
export function takePending(): "taken" | "none" | "stuck" {
  const [, error] = tryCatchSync(() => rmSync(cache("toucan.pending")));
  if (error === null) {
    return "taken";
  }
  return isMissing(error) ? "none" : "stuck";
}
