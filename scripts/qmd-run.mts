// Running qmd for Toucan's scripts: the repo root, calls on Toucan's own index,
// what is registered there now, and running jobs one at a time. Shared by
// `pnpm docs:index` and the hooks, so all of them plan and lock the same way.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  DOCS_COLLECTIONS,
  QMD_INDEX,
  parseCollectionList,
  parseCollectionShow,
} from "./qmd-docs.mts";
import type { IndexState } from "./qmd-docs.mts";
import { isPending, releaseLock, takeLock, takePending } from "./qmd-lock.mts";

/** The repo root at runtime (qmd stores real paths), so no path is committed. */
export const ROOT = realpathSync(fileURLToPath(new URL("..", import.meta.url)));

export function qmd(args: readonly string[], inherit = false) {
  return spawnSync("qmd", args, { encoding: "utf8", stdio: inherit ? "inherit" : "pipe" });
}

/** Whether qmd is on PATH (`--version` reads no index). */
export function hasQmd(): boolean {
  return !qmd(["--version"]).error;
}

/** Toucan's collections registered in its index. */
export function registeredNames(): Set<string> {
  return parseCollectionList(qmd([...QMD_INDEX, "collection", "list"]).stdout ?? "");
}

/** Whether every one of Toucan's collections is registered. */
export function allRegistered(): boolean {
  const names = registeredNames();
  return DOCS_COLLECTIONS.every(({ name }) => names.has(name));
}

/** What Toucan's index holds now, for planIndex. */
export function currentState(force: boolean): IndexState {
  const registered = Object.fromEntries(
    DOCS_COLLECTIONS.map(({ name }) => {
      const shown = qmd([...QMD_INDEX, "collection", "show", name]);
      return [
        name,
        shown.status === 0 ? parseCollectionShow(`${shown.stdout}${shown.stderr}`) : undefined,
      ];
    }),
  );
  return {
    root: ROOT,
    registered,
    exists: existsSync,
    // Only the recursive docs folder has subfolder contexts; the repo root's folders aren't docs.
    subfolders: (dir) =>
      dir === "."
        ? []
        : readdirSync(`${ROOT}/${dir}`, { withFileTypes: true })
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name),
    force,
  };
}

/**
 * Re-indexes Toucan's index for each pending edit, until none are left.
 * Returns false when a pending note is stuck (it can't be removed).
 */
export function drainPending(): boolean {
  let taken = takePending();
  while (taken === "taken") {
    qmd([...QMD_INDEX, "update"]);
    taken = takePending();
  }
  return taken === "none";
}

/** Rounds `exclusive` goes at most; edits noted after the last wait for the next job. */
const MAX_ROUNDS = 5;
/** How often a job waiting for the lock tries again. */
const LOCK_POLL_MS = 250;

/** Takes the lock, waiting up to `waitMs` for another job to let go of it. */
async function waitForLock(waitMs: number): Promise<string | undefined> {
  let lock = takeLock();
  for (let waited = 0; !lock && waited < waitMs; waited += LOCK_POLL_MS) {
    await new Promise((resolve) => setTimeout(resolve, LOCK_POLL_MS));
    lock = takeLock();
  }
  return lock;
}

/**
 * Runs `job` under the lock, then re-indexes for edits made meanwhile. A job
 * that returns false (qmd or the collections aren't ready) leaves the pending
 * edits for a later job. After letting go of the lock it checks once more, so
 * an edit made just before the release isn't lost, for at most MAX_ROUNDS
 * rounds, and never past a stuck pending note. Returns false, without
 * running `job`, when the lock stays held for `waitMs`: the job holding it
 * picks the edits up.
 */
export async function exclusive(
  job: (lock: string) => boolean | Promise<boolean>,
  { waitMs = 0, release = releaseLock }: { waitMs?: number; release?: (lock: string) => void } = {},
): Promise<boolean> {
  let lock = await waitForLock(waitMs);
  if (!lock) {
    return false;
  }
  for (let round = 0; lock; round++) {
    // False when the job isn't ready or a pending note is stuck: no more rounds.
    let again = false;
    try {
      if (round > 0 || (await job(lock))) {
        again = drainPending();
      }
    } finally {
      release(lock);
    }
    // Checked before taking the lock again, so the last round never ends holding it.
    lock = again && round + 1 < MAX_ROUNDS && isPending() ? takeLock() : undefined;
  }
  return true;
}
