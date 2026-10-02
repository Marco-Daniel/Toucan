import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isPending, markPending, releaseLock, takeLock } from "../../scripts/qmd-lock.mts";
import { exclusive } from "../../scripts/qmd-run.mts";
import { fakeQmd } from "./fake-qmd.ts";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "toucan-run-"));
  // Only the fake qmd, and the lock in this test's dir.
  vi.stubEnv("PATH", fakeQmd(dir, { collections: "'toucan-docs (qmd://toucan-docs/)'" }));
  vi.stubEnv("HOME", dir);
  vi.stubEnv("XDG_CACHE_HOME", dir);
});
afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(dir, { recursive: true, force: true });
});

const log = () =>
  existsSync(join(dir, "qmd.log")) ? readFileSync(join(dir, "qmd.log"), "utf8") : "";

describe("exclusive", () => {
  it("goes round again for an edit noted just as it lets go of the lock", async () => {
    let jobs = 0;
    let releases = 0;
    markPending();
    await exclusive(
      () => {
        jobs++;
        return true;
      },
      {
        release: (lock) => {
          // The first time, an edit lands between the last check and the release.
          if (releases++ === 0) {
            markPending();
          }
          releaseLock(lock);
        },
      },
    );
    expect(log()).toBe("update start\nupdate end\nupdate start\nupdate end\n");
    // The job (checking qmd and the collections) runs once, not every round.
    expect(jobs).toBe(1);
  });

  it("leaves the edits pending when the job isn't ready for them", async () => {
    markPending();
    expect(await exclusive(() => false)).toBe(true);
    expect(log()).toBe("");
    expect(isPending()).toBe(true);
    expect(takeLock()).toBeDefined();
  });

  it("doesn't run the job while another holds the lock", async () => {
    takeLock();
    let ran = false;
    expect(
      await exclusive(() => {
        ran = true;
        return true;
      }),
    ).toBe(false);
    expect(ran).toBe(false);
  });

  it("waits for the lock when asked to, then runs", async () => {
    const held = takeLock()!;
    let ran = false;
    const running = exclusive(
      () => {
        ran = true;
        return true;
      },
      { waitMs: 5000 },
    );
    expect(ran).toBe(false);
    releaseLock(held);
    expect(await running).toBe(true);
    expect(ran).toBe(true);
  });
});
