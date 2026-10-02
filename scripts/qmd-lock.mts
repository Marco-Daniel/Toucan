// One qmd job at a time for Toucan's scripts: concurrent writes to the same
// qmd database fail. All of them share one well-known, per-user folder in the
// OS temp dir, which must be a real folder owned by this user and closed to
// everyone else; if it isn't (someone planted a symlink, say), nothing runs.
// Files in it are opened without following symlinks.
import { randomUUID } from "node:crypto";
import {
  closeSync,
  constants,
  lstatSync,
  mkdirSync,
  openSync,
  readFileSync,
  renameSync,
  rmSync,
  writeSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** A lock older than this was left by a job that died, and is taken over. */
const STALE_MS = 5 * 60_000;
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

/** Takes the lock, taking over a stale one; undefined when another job holds it. */
export function takeLock(): Lock | undefined {
  const dir = lockFolder();
  if (!dir) {
    return undefined;
  }
  const lock = join(dir, "lock");
  const token = `${process.pid}-${randomUUID()}`;
  if (create(lock, token)) {
    return { dir, token };
  }
  // Held. Take it over only if it's stale, and only the lock we judged stale:
  // move it aside atomically, then check it's still the same one.
  let stat;
  try {
    stat = lstatSync(lock);
  } catch {
    return create(lock, token) ? { dir, token } : undefined;
  }
  if (!stat.isFile() || Date.now() - stat.mtimeMs <= STALE_MS) {
    return undefined;
  }
  const stale = read(lock);
  const aside = join(dir, `lock.${token}`);
  try {
    renameSync(lock, aside);
  } catch {
    return undefined;
  }
  if (read(aside) !== stale) {
    // Someone else took it over in between: leave theirs alone.
    rmSync(aside, { force: true });
    return undefined;
  }
  rmSync(aside, { force: true });
  return create(lock, token) ? { dir, token } : undefined;
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
