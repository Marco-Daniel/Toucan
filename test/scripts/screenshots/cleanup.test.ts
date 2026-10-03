// import libraries
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";

// import utils
import { Cleanup, EXIT_INTERRUPTED } from "../../../scripts/screenshots/cleanup.mts";

const CLEANUP = pathToFileURL(
  join(import.meta.dirname, "../../../scripts/screenshots/cleanup.mts"),
).href;

/** A detached process in its own group, like the capture VS Code: it sleeps until killed. */
function sleeper() {
  return spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], {
    detached: true,
    stdio: "ignore",
  });
}

function isRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** A temp folder with a file in it, standing in for the capture profile. */
function tempFolder(): string {
  const folder = mkdtempSync(join(tmpdir(), "toucan-cleanup-test-"));
  writeFileSync(join(folder, "settings.json"), "{}");
  return folder;
}

/**
 * Runs a script that sets up a Cleanup with a temp folder and a detached
 * sleeper, prints both, then ends however `end` says.
 */
async function runScript(end: string) {
  const script = `
    import { mkdtempSync, writeFileSync } from "node:fs";
    import { spawn } from "node:child_process";
    import { tmpdir } from "node:os";
    import { join } from "node:path";
    import { Cleanup } from ${JSON.stringify(CLEANUP)};
    const temp = mkdtempSync(join(tmpdir(), "toucan-cleanup-test-"));
    writeFileSync(join(temp, "settings.json"), "{}");
    const child = spawn(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { detached: true, stdio: "ignore" });
    const cleanup = new Cleanup(temp);
    cleanup.track(child);
    cleanup.handleExits();
    console.log(JSON.stringify({ pid: child.pid, temp }));
    setInterval(() => {}, 1000);
    ${end}
  `;
  const runner = spawn(process.execPath, ["--input-type=module", "-e", script], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  const started = await new Promise<{ pid: number; temp: string }>((resolve) => {
    runner.stdout.once("data", (chunk: Buffer) =>
      resolve(JSON.parse(chunk.toString()) as { pid: number; temp: string }),
    );
  });
  return { runner, ...started };
}

describe("Cleanup", () => {
  it("kills the tracked process group and removes the temp folder when abandoned", async () => {
    const temp = tempFolder();
    const child = sleeper();
    const exited = new Promise((resolve) => child.once("exit", (_code, signal) => resolve(signal)));
    const cleanup = new Cleanup(temp);
    cleanup.track(child);
    cleanup.abandon();
    expect(await exited).toBe("SIGKILL");
    expect(existsSync(temp)).toBe(false);
  });

  it("stops the group gently on close", async () => {
    const temp = tempFolder();
    const child = sleeper();
    const cleanup = new Cleanup(temp);
    cleanup.track(child);
    await cleanup.close();
    expect([child.signalCode, existsSync(temp)]).toEqual(["SIGTERM", false]);
  });

  it.each(["SIGINT", "SIGTERM", "SIGHUP"] as const)(
    "leaves no process or folder behind when the run gets %s",
    async (signal) => {
      const { runner, pid, temp } = await runScript("");
      const code = new Promise((resolve) => runner.once("exit", (exitCode) => resolve(exitCode)));
      runner.kill(signal);
      expect(await code).toBe(EXIT_INTERRUPTED);
      expect([isRunning(pid), existsSync(temp)]).toEqual([false, false]);
    },
  );

  it("leaves no process or folder behind when the run throws", async () => {
    const { runner, pid, temp } = await runScript(
      `setTimeout(() => { throw new Error("boom"); }, 50);`,
    );
    const code = await new Promise((resolve) =>
      runner.once("exit", (exitCode) => resolve(exitCode)),
    );
    expect(code).toBe(1);
    expect([isRunning(pid), existsSync(temp)]).toEqual([false, false]);
  });
});
