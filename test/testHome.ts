// Gives each test run its own HOME and qmd cache, which every test worker
// inherits: code that outlives a test's own stubs (late async work, say)
// lands there, never in the real ~/.cache/qmd. Removed when the run ends.
// import libraries
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export default function setup(): () => void {
  const home = mkdtempSync(join(tmpdir(), "toucan-test-home-"));
  process.env["HOME"] = home;
  process.env["XDG_CACHE_HOME"] = home;
  return () => rmSync(home, { recursive: true, force: true });
}
