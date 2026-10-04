// Gives each test run its own folder, which every test worker and every
// process a test spawns inherits:
// - home/: HOME and the qmd cache, so code that outlives a test's own stubs
//   (late async work, say) lands there, never in the real ~/.cache/qmd;
// - tmp/: TMPDIR, so every temp folder a test makes lands there.
// When the run ends the folder is removed, and the run fails if any test left
// something in tmp/: each test removes what it made. Nothing outside the run
// folder is ever listed or removed, so runs side by side don't meet.
// import libraries
import { mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Every run folder's name starts with this. */
export const RUN_PREFIX = "toucan-test-run-";

/** What a test run left in its temp folder, as the error to fail it with, or undefined when it left nothing. */
export function leftoversError(names: readonly string[]): Error | undefined {
  return names.length === 0
    ? undefined
    : new Error(
        `Tests left ${names.length} temp ${names.length === 1 ? "entry" : "entries"} behind; each test must remove what it makes: ${names.toSorted().join(", ")}`,
      );
}

export default function setup(): () => void {
  const run = mkdtempSync(join(tmpdir(), RUN_PREFIX));
  const home = join(run, "home");
  const temp = join(run, "tmp");
  mkdirSync(home);
  mkdirSync(temp);
  process.env["HOME"] = home;
  process.env["XDG_CACHE_HOME"] = home;
  process.env["TMPDIR"] = temp;
  return () => {
    const error = leftoversError(readdirSync(temp));
    rmSync(run, { recursive: true, force: true });
    if (error !== undefined) {
      throw error;
    }
  };
}
