// `pnpm docs:index`: registers or updates Toucan's docs in qmd (optional local
// search, see README), then re-indexes and refreshes embeddings. Safe to rerun.
// qmd's config is global, so this only ever touches `toucan-*` collections.
// `--force` re-points collections registered at another existing checkout.
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, realpathSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { DOCS_COLLECTIONS, parseCollectionShow, planIndex } from "./qmd-docs.mts";

const qmd = (args: string[], inherit = false) =>
  spawnSync("qmd", args, { encoding: "utf8", stdio: inherit ? "inherit" : "pipe" });

if (qmd(["--version"]).error) {
  console.error(
    "qmd isn't installed. It's optional: `npm i -g @tobilu/qmd` (see README, Development), then rerun `pnpm docs:index`.",
  );
  process.exit(1);
}

// The repo root at runtime (qmd stores real paths), so no path is committed.
const root = realpathSync(fileURLToPath(new URL("..", import.meta.url)));

const registered = Object.fromEntries(
  DOCS_COLLECTIONS.map(({ name }) => {
    const shown = qmd(["collection", "show", name]);
    return [
      name,
      shown.status === 0 ? parseCollectionShow(`${shown.stdout}${shown.stderr}`) : undefined,
    ];
  }),
);

const { commands, notes } = planIndex({
  root,
  registered,
  exists: existsSync,
  // Only the recursive docs folder has subfolder contexts; the repo root's folders aren't docs.
  subfolders: (dir) =>
    dir === "."
      ? []
      : readdirSync(`${root}/${dir}`, { withFileTypes: true })
          .filter((entry) => entry.isDirectory())
          .map((entry) => entry.name),
  force: process.argv.includes("--force"),
});

for (const note of notes) {
  console.warn(note);
}
for (const args of commands) {
  console.log(`qmd ${args.join(" ")}`);
  if (qmd(args, true).status !== 0) {
    console.error(`qmd ${args[0]} failed; stopping.`);
    process.exit(1);
  }
}
