// import libraries
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// import utils
import { stopWorkers } from "./qmd.ts";

let dir: string;
let script: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "toucan-workers-"));
  // A stand-in worker that never ends, like one a looping mutant leaves behind.
  script = join(dir, "hook.mts");
  writeFileSync(script, "setInterval(() => {}, 1000);\n");
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

/** Starts the stand-in worker detached, as a hook does, with HOME set to `home`. */
function startDetached(home: string) {
  const child = spawn(process.execPath, [script, "--worker"], {
    detached: true,
    stdio: "ignore",
    env: { HOME: home },
  });
  child.unref();
  return child;
}

const running = (pid: number) => {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
};

describe("stopWorkers", () => {
  it("kills the detached workers started with the test's HOME, and only those", async () => {
    const mine = startDetached(dir);
    const other = startDetached(join(dir, "elsewhere"));
    try {
      await vi.waitFor(() =>
        expect([running(mine.pid!), running(other.pid!)]).toEqual([true, true]),
      );
      stopWorkers({ script, home: dir });
      await vi.waitFor(() => expect(running(mine.pid!)).toBe(false));
      expect(running(other.pid!)).toBe(true);
    } finally {
      for (const child of [mine, other]) {
        child.kill("SIGKILL");
      }
    }
  });
});
