// Claude Code PostToolUse hook: after an edit to a file in one of Toucan's qmd
// collections, refresh the keyword index of Toucan's own qmd index in the
// background (embeddings refresh on the next `pnpm docs:index`). It never
// touches your other qmd collections. Silent and never blocking: it does
// nothing without qmd or without Toucan's collections registered.
//
// The edit is noted as pending, then a detached worker re-indexes under the
// shared lock until no edit is pending. If another job holds the lock, that
// job picks the edit up; if the collections aren't registered yet, the edit
// stays pending for the session-start bootstrap.
import { spawn } from "node:child_process";
import { text } from "node:stream/consumers";
import { tryCatch } from "../src/shared/async/tryCatch.util.ts";
import { isRecord } from "../src/shared/records/records.util.ts";
import { isIndexedDoc } from "./qmd-docs.mts";
import { markPending } from "./qmd-lock.mts";
import { exclusive, hasQmd, registeredNames } from "./qmd-run.mts";

if (process.argv[2] === "--worker") {
  await exclusive({ job: () => hasQmd() && registeredNames().size > 0 });
} else {
  const root = process.env["CLAUDE_PROJECT_DIR"];
  // Input that can't be read or isn't JSON isn't hook input: nothing to do.
  const [input] = await tryCatch(async (): Promise<unknown> =>
    JSON.parse(await text(process.stdin)),
  );
  const tool = isRecord(input) ? input["tool_input"] : undefined;
  const file = isRecord(tool) ? tool["file_path"] : undefined;
  if (root && typeof file === "string" && isIndexedDoc({ file, root })) {
    markPending();
    spawn(process.execPath, [process.argv[1]!, "--worker"], {
      detached: true,
      stdio: "ignore",
    })
      // A failed spawn (say, a process limit) stays silent like everything else here.
      // Untested on purpose: spawning this same Node binary can't be made to fail on demand.
      .on("error", () => undefined)
      .unref();
  }
}
