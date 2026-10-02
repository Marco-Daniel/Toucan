// One qmd job at a time for Toucan's hooks: concurrent writes to the same qmd
// database fail. The lock lives in the OS temp dir; a lock older than
// STALE_MS was left by a job that died and is taken over.
import { closeSync, openSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const LOCK = join(tmpdir(), "toucan-qmd-update.lock");
/** Marks an edit made while a job held the lock, so the job goes round once more. */
export const PENDING = `${LOCK}.pending`;
const STALE_MS = 5 * 60_000;

/** Takes the lock, replacing a stale one. */
export function takeLock(): boolean {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      closeSync(openSync(LOCK, "wx"));
      return true;
    } catch {
      // Held by a running job, or left behind by one that died.
    }
    try {
      if (Date.now() - statSync(LOCK).mtimeMs <= STALE_MS) {
        return false;
      }
      rmSync(LOCK);
    } catch {
      // Released in the meantime: try again.
    }
  }
  return false;
}

export function releaseLock(): void {
  rmSync(LOCK, { force: true });
}

export function markPending(): void {
  writeFileSync(PENDING, "");
}
