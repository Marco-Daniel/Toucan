// import libraries
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** The repo root. */
export const ROOT = join(import.meta.dirname, "..", "..");

/**
 * Each workspace package's folder, relative to the root, from
 * pnpm-workspace.yaml's `<group>/*` globs. Read from the filesystem, not git,
 * so it works in Stryker's sandbox and in a source tarball too.
 */
export function packageFolders(): string[] {
  const workspace = readFileSync(join(ROOT, "pnpm-workspace.yaml"), "utf8");
  const globs = /^packages:\n((?:[ \t]+- .*\n)+)/m.exec(workspace)?.[1] ?? "";
  return [...globs.matchAll(/- ([\w-]+)\/\*$/gm)].flatMap(([, group = ""]) =>
    readdirSync(join(ROOT, group), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => `${group}/${entry.name}`)
      .toSorted(),
  );
}
