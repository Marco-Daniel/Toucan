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
  type IndexState,
} from "./qmd-docs.mts";
import { isPending, releaseLock, takeLock, takePending, type Lock } from "./qmd-lock.mts";

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

/** Re-indexes Toucan's index for each pending edit, until none are left. */
export function drainPending(dir: string): void {
  while (takePending(dir)) {
    qmd([...QMD_INDEX, "update"]);
  }
}

/**
 * Runs `job` under the lock, then re-indexes for edits made meanwhile, if
 * `job` says the index is ready for that. After letting go of the lock it
 * checks once more, so an edit made just before the release isn't lost.
 * Does nothing when another job holds the lock: that job picks up the edits.
 */
export function exclusive(job: () => boolean, release: (lock: Lock) => void = releaseLock): void {
  let lock = takeLock();
  let first = true;
  while (lock) {
    const { dir } = lock;
    try {
      if (first ? job() : true) {
        drainPending(dir);
      } else {
        takePending(dir);
      }
    } finally {
      release(lock);
    }
    first = false;
    lock = isPending(dir) ? takeLock() : undefined;
  }
}
