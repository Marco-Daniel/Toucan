// One qmd job at a time for Toucan's scripts: concurrent writes to the same
// qmd database fail. All of them share one well-known, per-user folder in the
// OS temp dir, which must be a real folder owned by this user and closed to
// everyone else; if it isn't (someone planted a symlink, say), nothing runs.
// Files in it are opened without following symlinks.
import { randomUUID } from "node:crypto";
import {
  closeSync,
  constants,
  linkSync,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  utimesSync,
  writeSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** A lock whose owner can't be checked counts as left behind after this. */
const STALE_MS = 5 * 60_000;
/** Even a live owner's lock counts as left behind after this (its pid may have been reused). */
const MAX_AGE_MS = 60 * 60_000;
const { O_CREAT, O_EXCL, O_NOFOLLOW, O_WRONLY, O_RDONLY } = constants;

/** The shared folder, or undefined when it can't be trusted. */
export function lockFolder(): string | undefined {
  const uid = process.getuid?.() ?? 0;
  const dir = join(tmpdir(), `toucan-qmd-${uid}`);
  try {
    mkdirSync(dir, { mode: 0o700 });
  } catch {
    // Already there: checked below.
  }
  try {
    const stat = lstatSync(dir);
    const own = stat.isDirectory() && stat.uid === uid && (stat.mode & 0o077) === 0;
    return own ? dir : undefined;
  } catch {
    return undefined;
  }
}

function read(path: string): string | undefined {
  try {
    const fd = openSync(path, O_RDONLY | O_NOFOLLOW);
    try {
      return readFileSync(fd, "utf8");
    } finally {
      closeSync(fd);
    }
  } catch {
    return undefined;
  }
}

/** Creates `path` holding `text`, failing if anything (a symlink included) is already there. */
function create(path: string, text: string): boolean {
  try {
    const fd = openSync(path, O_CREAT | O_EXCL | O_WRONLY | O_NOFOLLOW, 0o600);
    try {
      writeSync(fd, text);
    } finally {
      closeSync(fd);
    }
    return true;
  } catch {
    return false;
  }
}

/** A held lock: release it with the token. */
export interface Lock {
  dir: string;
  token: string;
}

/** Whether the process that wrote `token` (`<pid>-<uuid>`) is still running; undefined without a pid. */
function ownerAlive(token: string | undefined): boolean | undefined {
  const pid = Number(token?.split("-")[0]);
  if (!Number.isInteger(pid) || pid <= 0) {
    return undefined;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

/**
 * Whether a held lock was left by a job that's gone: its owner process has
 * exited, or it's older than an hour (in case the pid was reused). A lock
 * without an owner pid goes stale after STALE_MS.
 */
function isStale(token: string | undefined, mtimeMs: number): boolean {
  const age = Date.now() - mtimeMs;
  const alive = ownerAlive(token);
  return alive === undefined ? age > STALE_MS : !alive || age > MAX_AGE_MS;
}

/**
 * Takes the lock, taking over a stale one; undefined when another job holds
 * it. `beforeTakeover` runs between judging a lock stale and moving it, so
 * tests can replay a race.
 */
export function takeLock(beforeTakeover?: () => void): Lock | undefined {
  const dir = lockFolder();
  if (!dir) {
    return undefined;
  }
  const lock = join(dir, "lock");
  const token = `${process.pid}-${randomUUID()}`;
  if (create(lock, token)) {
    return { dir, token };
  }
  let judged;
  try {
    judged = lstatSync(lock);
  } catch {
    // Released in the meantime.
    return create(lock, token) ? { dir, token } : undefined;
  }
  if (!judged.isFile() || !isStale(read(lock), judged.mtimeMs)) {
    return undefined;
  }
  beforeTakeover?.();
  // Move it aside atomically, then make sure it's the very lock judged stale.
  const aside = join(dir, `lock.${token}`);
  try {
    renameSync(lock, aside);
  } catch {
    return undefined;
  }
  const moved = lstatSync(aside);
  if (moved.ino !== judged.ino || moved.mtimeMs !== judged.mtimeMs) {
    // Another job took it over in between: put its lock back.
    try {
      linkSync(aside, lock);
      rmSync(aside);
    } catch {
      // A third job holds the lock now; leave the moved one where it is.
    }
    return undefined;
  }
  rmSync(aside);
  return create(lock, token) ? { dir, token } : undefined;
}

/** Marks a held lock as still in use, for jobs that run long. */
export function touchLock({ dir, token }: Lock): void {
  const lock = join(dir, "lock");
  if (read(lock) === token) {
    const now = new Date();
    utimesSync(lock, now, now);
  }
}

/** Releases the lock if it's still ours. */
export function releaseLock({ dir, token }: Lock): void {
  const lock = join(dir, "lock");
  if (read(lock) === token) {
    rmSync(lock, { force: true });
  }
}

/** Notes an edit made while a job may be running, so it goes round once more. */
export function markPending(): void {
  const dir = lockFolder();
  if (dir) {
    create(join(dir, "pending"), "");
  }
}

/** Takes the pending note, if there is one. */
export function takePending(dir: string): boolean {
  try {
    rmSync(join(dir, "pending"));
    return true;
  } catch {
    return false;
  }
}

/** Whether an edit is pending, without taking it. */
export function isPending(dir: string): boolean {
  try {
    return lstatSync(join(dir, "pending")).isFile();
  } catch {
    return false;
  }
}
