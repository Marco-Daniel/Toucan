import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { markPending, releaseLock } from "../../scripts/qmd-lock.mts";
import { exclusive } from "../../scripts/qmd-run.mts";
import { fakeQmd } from "./fake-qmd.ts";

const saved = { PATH: process.env.PATH, TMPDIR: process.env.TMPDIR, HOME: process.env.HOME };
let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "toucan-run-"));
  // Only the fake qmd, and the lock folder in this test's dir.
  process.env.PATH = fakeQmd(dir, { collections: "'toucan-docs (qmd://toucan-docs/)'" });
  process.env.TMPDIR = dir;
  process.env.HOME = dir;
});
afterEach(() => {
  Object.assign(process.env, saved);
  rmSync(dir, { recursive: true, force: true });
});

const log = () =>
  existsSync(join(dir, "qmd.log")) ? readFileSync(join(dir, "qmd.log"), "utf8") : "";

describe("exclusive", () => {
  it("goes round again for an edit noted just as it lets go of the lock", () => {
    let jobs = 0;
    let releases = 0;
    markPending();
    exclusive(
      () => {
        jobs++;
        return true;
      },
      (lock) => {
        // The first time, an edit lands between the last check and the release.
        if (releases++ === 0) {
          markPending();
        }
        releaseLock(lock);
      },
    );
    expect(log()).toBe("update start\nupdate end\nupdate start\nupdate end\n");
    // The job (checking qmd and the collections) runs once, not every round.
    expect(jobs).toBe(1);
  });
});
