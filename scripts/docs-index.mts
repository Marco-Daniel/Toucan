// `pnpm docs:index`: registers or updates Toucan's docs in qmd (the docs search
// used when working on Toucan, see README), then re-indexes and refreshes
// embeddings. Safe to rerun. It uses Toucan's own qmd index (`--index toucan`),
// so it never touches your other collections. `--force` re-points collections
// registered at another existing checkout. It waits for any other qmd job of
// Toucan's (the hooks) to finish first, and holds the lock while it runs.
//
// Worktrees: the index points at the checkout that registered it, so a search
// from another worktree sees that checkout's docs, not its own.
import { spawn } from "node:child_process";
import { QMD_INDEX, planIndex } from "./qmd-docs.mts";
import { touchLock } from "./qmd-lock.mts";
import { currentState, exclusive, hasQmd } from "./qmd-run.mts";

/** Runs qmd with its output shown; resolves to whether it succeeded. */
const run = (args: readonly string[]) =>
  new Promise<boolean>((resolve) => {
    spawn("qmd", args, { stdio: "inherit" })
      .on("error", () => resolve(false))
      .on("close", (code) => resolve(code === 0));
  });

// The TOUCAN_QMD_* overrides shorten the waits in tests.
const WAIT_MS = Number(process.env["TOUCAN_QMD_WAIT_MS"]) || 60_000;
const HEARTBEAT_MS = Number(process.env["TOUCAN_QMD_HEARTBEAT_MS"]) || 60_000;

if (!hasQmd()) {
  console.error(
    "qmd isn't installed. Working on Toucan uses it for docs search: `npm i -g @tobilu/qmd` (see README, Development), then rerun `pnpm docs:index`.",
  );
  process.exit(1);
}

const ran = await exclusive(
  async (lock) => {
    // A single qmd command can run long (the first embed downloads models): keep the lock fresh.
    const heartbeat = setInterval(() => touchLock(lock), HEARTBEAT_MS);
    try {
      const { commands, notes } = planIndex(currentState(process.argv.includes("--force")));
      for (const note of notes) {
        console.warn(note);
      }
      for (const args of commands) {
        console.log(`qmd ${args.join(" ")}`);
        // oxlint-disable-next-line no-await-in-loop -- qmd commands run in order
        if (!(await run(args))) {
          console.error(
            `qmd ${args.slice(QMD_INDEX.length, QMD_INDEX.length + 2).join(" ")} failed; stopping.`,
          );
          process.exitCode = 1;
          return false;
        }
      }
      return true;
    } finally {
      clearInterval(heartbeat);
    }
  },
  { waitMs: WAIT_MS },
);
if (!ran) {
  console.error(
    "Another qmd job for Toucan is still running (a hook re-indexing). Try again in a minute.",
  );
  process.exitCode = 1;
}
