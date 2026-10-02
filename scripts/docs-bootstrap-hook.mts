// Claude Code SessionStart hook: if qmd is installed but Toucan's own qmd
// index has none of its collections yet, register them and build the keyword
// index in the background, so search works in any clone without a manual
// step. No embeddings (and no model download): those come with an explicit
// `pnpm docs:index`. Silent and never blocking; it shares the update hook's
// lock, so only one qmd job runs at a time.
import { spawn } from "node:child_process";
import { planIndex } from "./qmd-docs.mts";
import { releaseLock, takeLock } from "./qmd-lock.mts";
import { currentState, hasQmd, isRegistered, qmd } from "./qmd-run.mts";

if (process.argv[2] !== "--worker") {
  // Hand the work to a detached copy of this script, so the session starts at once.
  const child = spawn(process.execPath, [process.argv[1]!, "--worker"], {
    detached: true,
    stdio: "ignore",
  });
  child.on("error", () => {});
  child.unref();
} else if (takeLock()) {
  try {
    if (hasQmd() && !isRegistered()) {
      for (const args of planIndex(currentState(false), { embed: false }).commands) {
        if (qmd(args).status !== 0) {
          break;
        }
      }
    }
  } finally {
    releaseLock();
  }
}
