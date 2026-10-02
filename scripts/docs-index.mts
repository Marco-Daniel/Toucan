// `pnpm docs:index`: registers or updates Toucan's docs in qmd (the docs search
// used when working on Toucan, see README), then re-indexes and refreshes
// embeddings. Safe to rerun.
// It uses Toucan's own qmd index (`--index toucan`), so it never touches your
// other collections. `--force` re-points collections registered at another
// existing checkout. It waits for any other qmd job of Toucan's (the hooks)
// to finish first.
//
// Worktrees: the index points at the checkout that registered it, so a search
// from another worktree sees that checkout's docs, not its own.
import { QMD_INDEX, planIndex } from "./qmd-docs.mts";
import { lockFolder, releaseLock, takeLock, touchLock, type Lock } from "./qmd-lock.mts";
import { currentState, drainPending, hasQmd, qmd } from "./qmd-run.mts";

const WAIT_MS = 60_000;

if (!hasQmd()) {
  console.error(
    "qmd isn't installed. Working on Toucan uses it for docs search: `npm i -g @tobilu/qmd` (see README, Development), then rerun `pnpm docs:index`.",
  );
  process.exit(1);
}
if (!lockFolder()) {
  console.error(
    "Toucan's qmd lock folder in the temp dir isn't a private folder of yours; not running.",
  );
  process.exit(1);
}

let lock: Lock | undefined;
for (let waited = 0; !(lock = takeLock()) && waited < WAIT_MS; waited += 250) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
}
if (!lock) {
  console.error(
    "Another qmd job for Toucan is still running (a hook re-indexing). Try again in a minute.",
  );
  process.exit(1);
}

try {
  const { commands, notes } = planIndex(currentState(process.argv.includes("--force")));
  for (const note of notes) {
    console.warn(note);
  }
  for (const args of commands) {
    touchLock(lock);
    console.log(`qmd ${args.join(" ")}`);
    if (qmd(args, true).status !== 0) {
      console.error(
        `qmd ${args.slice(QMD_INDEX.length, QMD_INDEX.length + 2).join(" ")} failed; stopping.`,
      );
      process.exitCode = 1;
      break;
    }
  }
  // Edits the hooks noted while this ran.
  drainPending(lock.dir);
} finally {
  releaseLock(lock);
}
