// Claude Code SessionStart hook: if qmd is installed but Toucan's own qmd
// index doesn't have all its collections yet, register them and build the
// keyword index in the background, so search works in any clone without a
// manual step. No embeddings (and no model download): those come with an
// explicit `pnpm docs:index`. Silent and never blocking; it shares the lock
// with the other qmd jobs, so only one runs at a time.
import { planIndex } from "./qmd-docs.mts";
import { allRegistered, currentState, exclusive, hasQmd, qmd, spawnWorker } from "./qmd-run.mts";

if (process.argv[2] === "--worker") {
  // Wait for a job that's running (an edit's re-index, say), then register.
  await exclusive({
    job: () => {
      if (!hasQmd()) {
        return false;
      }
      if (!allRegistered()) {
        for (const args of planIndex({ state: currentState(false), embed: false }).commands) {
          if (qmd(args).status !== 0) {
            return false;
          }
        }
      }
      return true;
    },
    waitMs: 120_000,
  });
} else {
  // Hand the work to a detached copy of this script, so the session starts at once.
  spawnWorker();
}
