// One qmd job at a time for Toucan's scripts: concurrent writes to the same
// qmd database fail. The lock and the pending note live in qmd's own per-user
// cache folder, next to Toucan's index, and are created exclusively, which
// never follows a symlink. A lock older than STALE_MS was left by a job that
// died; long jobs refresh theirs.
import {
  closeSync,
  constants,
  existsSync,
  mkdirSync,
  openSync,
  rmSync,
  statSync,
  utimesSync,
} from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const STALE_MS = 10 * 60_000;

/** qmd's cache folder, resolved the way qmd resolves it. */
function cache(name: string): string {
  const dir = join(process.env.XDG_CACHE_HOME || join(homedir(), ".cache"), "qmd");
  mkdirSync(dir, { recursive: true });
  return join(dir, name);
}

function create(path: string): boolean {
  try {
    const { O_CREAT, O_EXCL, O_WRONLY } = constants;
    closeSync(openSync(path, O_CREAT | O_EXCL | O_WRONLY, 0o600));
    return true;
  } catch {
    return false;
  }
}

/** Takes the lock (replacing a stale one) and returns its path, or undefined if held. */
export function takeLock(): string | undefined {
  const lock = cache("toucan.lock");
  try {
    if (Date.now() - statSync(lock).mtimeMs > STALE_MS) {
      rmSync(lock);
    }
  } catch {
    // Not there: free.
  }
  return create(lock) ? lock : undefined;
}

export function touchLock(lock: string): void {
  const now = new Date();
  utimesSync(lock, now, now);
}

export function releaseLock(lock: string): void {
  rmSync(lock, { force: true });
}

/** Notes an edit, so a running job goes round once more. */
export const markPending = (): boolean => create(cache("toucan.pending"));
export const isPending = (): boolean => existsSync(cache("toucan.pending"));

/** Takes the pending note, if there is one. */
export function takePending(): boolean {
  try {
    rmSync(cache("toucan.pending"));
    return true;
  } catch {
    return false;
  }
}
