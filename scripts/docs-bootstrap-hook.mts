// Claude Code SessionStart hook: if qmd is installed but Toucan's own qmd
// index doesn't have all its collections yet, register them and build the
// keyword index in the background, so search works in any clone without a
// manual step. No embeddings (and no model download): those come with an
// explicit `pnpm docs:index`. Silent and never blocking; it shares the lock
// with the other qmd jobs, so only one runs at a time.
import { spawn } from "node:child_process";
import { planIndex } from "./qmd-docs.mts";
import { allRegistered, currentState, exclusive, hasQmd, qmd } from "./qmd-run.mts";

if (process.argv[2] === "--worker") {
  // Wait for a job that's running (an edit's re-index, say), then register.
  await exclusive(
    () => {
      if (!hasQmd()) {
        return false;
      }
      if (!allRegistered()) {
        for (const args of planIndex(currentState(false), { embed: false }).commands) {
          if (qmd(args).status !== 0) {
            return false;
          }
        }
      }
      return true;
    },
    { waitMs: 120_000 },
  );
} else {
  // Hand the work to a detached copy of this script, so the session starts at once.
  spawn(process.execPath, [process.argv[1]!, "--worker"], {
    detached: true,
    stdio: "ignore",
  })
    // A failed spawn (say, a process limit) stays silent like everything else here.
    // Untested on purpose: spawning this same Node binary can't be made to fail on demand.
    .on("error", () => undefined)
    .unref();
}
