// Claude Code PostToolUse hook: after an edit to a file in one of Toucan's qmd
// collections, refresh qmd's keyword index in the background (embeddings
// refresh on the next `pnpm docs:index`). Silent and never blocking: it does
// nothing without qmd or without Toucan's collections registered.
import { spawn } from "node:child_process";
import { text } from "node:stream/consumers";
import { isIndexedDoc } from "./qmd-docs.mts";

const root = process.env.CLAUDE_PROJECT_DIR;
let file: unknown;
try {
  file = (JSON.parse(await text(process.stdin)) as { tool_input?: { file_path?: unknown } })
    .tool_input?.file_path;
} catch {
  // Not hook input: nothing to do.
}

if (root && typeof file === "string" && isIndexedDoc(file, root)) {
  const child = spawn(
    "sh",
    ["-c", 'qmd collection list 2>/dev/null | grep -q "^toucan-" && qmd update'],
    {
      detached: true,
      stdio: "ignore",
    },
  );
  child.unref();
}
