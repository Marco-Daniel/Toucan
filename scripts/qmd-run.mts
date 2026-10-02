// Running qmd for Toucan's scripts: the repo root, calls on Toucan's own index
// and what is registered there now. Shared by `pnpm docs:index` and the
// session-start hook, so both plan with the same state.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { DOCS_COLLECTIONS, QMD_INDEX, parseCollectionShow, type IndexState } from "./qmd-docs.mts";

/** The repo root at runtime (qmd stores real paths), so no path is committed. */
export const ROOT = realpathSync(fileURLToPath(new URL("..", import.meta.url)));

export function qmd(args: readonly string[], inherit = false) {
  return spawnSync("qmd", args, { encoding: "utf8", stdio: inherit ? "inherit" : "pipe" });
}

/** Whether qmd is on PATH (`--version` reads no index). */
export function hasQmd(): boolean {
  return !qmd(["--version"]).error;
}

/** Whether Toucan's index has any of its collections registered. */
export function isRegistered(): boolean {
  return /^toucan-/m.test(qmd([...QMD_INDEX, "collection", "list"]).stdout ?? "");
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
