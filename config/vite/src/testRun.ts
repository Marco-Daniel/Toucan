// Gives each test run its own folder, which every test worker and every
// process a test spawns inherits:
// - home/: HOME and the qmd cache, so code that outlives a test's own stubs
//   (late async work, say) lands there, never in the real ~/.cache/qmd;
// - tmp/: TMPDIR, so every temp folder a test makes lands there.
// When the run ends the folder is removed, and the run fails if any test left
// something in tmp/: each test removes what it made. Nothing outside the run
// folder is ever listed or removed, so runs side by side don't meet.
//
// A test that runs Vitest itself starts a nested run with its own run folder
// inside this one's tmp/: if that nested run is killed before it ends, this
// run's check names its folder.
//
// The one deliberate exception is /tmp: the screenshot script puts VS Code's
// profile there, because its socket path must stay under about 100
// characters. The tests that make folders there check in afterAll that
// they're gone (test/scripts/screenshots/cleanup.test.ts).
// import libraries
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
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

/** A started run: its folder, its temp folder (TMPDIR), and its teardown. */
export interface Run {
  run: string;
  temp: string;
  teardown: () => void;
}

/** Starts a run in the current temp folder and points this process's HOME, cache and TMPDIR at it. */
export function startRun(): Run {
  const run = mkdtempSync(join(tmpdir(), RUN_PREFIX));
  const home = join(run, "home");
  const temp = join(run, "tmp");
  mkdirSync(home);
  mkdirSync(temp);
  process.env["HOME"] = home;
  process.env["XDG_CACHE_HOME"] = home;
  process.env["TMPDIR"] = temp;
  const teardown = () => {
    try {
      // A test that removed the temp folder itself counts as a leftover too; one
      // that replaced it with a file makes the read throw, which fails the run as well.
      const names = existsSync(temp) ? readdirSync(temp) : ["tmp/ itself, which a test removed"];
      const error = leftoversError(names);
      if (error !== undefined) {
        throw error;
      }
    } finally {
      // The run folder goes whatever the check found.
      rmSync(run, { recursive: true, force: true });
    }
  };
  return { run, temp, teardown };
}

export default function setup(): () => void {
  return startRun().teardown;
}
