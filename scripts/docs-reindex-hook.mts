// Claude Code PostToolUse hook: after an edit to a file in one of Toucan's qmd
// collections, refresh the keyword index of Toucan's own qmd index in the
// background (embeddings refresh on the next `pnpm docs:index`). It never
// touches your other qmd collections. Silent and never blocking: it does
// nothing without qmd, without sh, or without Toucan's collections registered.
//
// One update at a time: concurrent qmd updates fail on the same database. An
// edit while one runs leaves a "pending" marker, and the running job goes
// round once more, so no edit is missed.
import { spawn } from "node:child_process";
import { text } from "node:stream/consumers";
import { QMD_INDEX, isIndexedDoc } from "./qmd-docs.mts";
import { LOCK, PENDING, markPending, releaseLock, takeLock } from "./qmd-lock.mts";

// $1 is the lock, $2 the pending marker. Only Toucan's index, and only if its
// collections are registered; then update until no edit is pending.
const QMD = ["qmd", ...QMD_INDEX].join(" ");
const JOB = `
${QMD} collection list 2>/dev/null | grep -q "^toucan-" || { rm -f "$1"; exit 0; }
while :; do
  rm -f "$2"
  ${QMD} update >/dev/null 2>&1
  [ -e "$2" ] || break
done
rm -f "$1"
`;

const root = process.env.CLAUDE_PROJECT_DIR;
let file: unknown;
try {
  file = (JSON.parse(await text(process.stdin)) as { tool_input?: { file_path?: unknown } })
    .tool_input?.file_path;
} catch {
  // Not hook input: nothing to do.
}

if (root && typeof file === "string" && isIndexedDoc(file, root)) {
  if (takeLock()) {
    const child = spawn("sh", ["-c", JOB, "sh", LOCK, PENDING], {
      detached: true,
      stdio: "ignore",
    });
    // No sh: stay silent, and don't keep the lock.
    child.on("error", releaseLock);
    child.unref();
  } else {
    markPending();
  }
}
