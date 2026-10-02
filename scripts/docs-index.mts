// `pnpm docs:index`: registers or updates Toucan's docs in qmd (optional local
// search, see README), then re-indexes and refreshes embeddings. Safe to rerun.
// It uses Toucan's own qmd index (`--index toucan`), so it never touches your
// other collections. `--force` re-points collections registered at another
// existing checkout.
//
// Worktrees: the index points at the checkout that registered it, so a search
// from another worktree sees that checkout's docs, not its own.
import { QMD_INDEX, planIndex } from "./qmd-docs.mts";
import { currentState, hasQmd, qmd } from "./qmd-run.mts";

if (!hasQmd()) {
  console.error(
    "qmd isn't installed. It's optional: `npm i -g @tobilu/qmd` (see README, Development), then rerun `pnpm docs:index`.",
  );
  process.exit(1);
}

const { commands, notes } = planIndex(currentState(process.argv.includes("--force")));

for (const note of notes) {
  console.warn(note);
}
for (const args of commands) {
  console.log(`qmd ${args.join(" ")}`);
  if (qmd(args, true).status !== 0) {
    console.error(
      `qmd ${args.slice(QMD_INDEX.length, QMD_INDEX.length + 2).join(" ")} failed; stopping.`,
    );
    process.exit(1);
  }
}
