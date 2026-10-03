// Safety first: these tests start real processes and may run with a mutant
// that removed the code's guards. So nothing here sends a signal or removes a
// folder except through guardedPorts (or, in a spawned harness, its own
// copy), which refuse every target the test didn't make. Never pass pid 1 or
// 0 to anything that signals, not even to see it refuse: process.kill(-1)
// reaches every process of the user.
// import libraries
import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// import utils
import {
  Cleanup,
  EXIT_INTERRUPTED,
  groupTarget,
  killGroup,
  parsePs,
  processesUsing,
  safeTemp,
  SYSTEM_PORTS,
  TEMP_PREFIX,
} from "../../../scripts/screenshots/cleanup.mts";

// import types
import type { ChildProcess } from "node:child_process";
import type { CleanupPorts } from "../../../scripts/screenshots/cleanup.mts";

const CLEANUP = pathToFileURL(
  join(import.meta.dirname, "../../../scripts/screenshots/cleanup.mts"),
).href;
/**
 * Sleeps until killed, or until this test process is gone: a mutant that
 * times out gets its test process killed before afterEach runs, and the
 * sleepers it started must not outlive it. They watch this process, not their
 * parent, so a grandchild still needs its group killed to end.
 */
const SLEEP = `const owner = ${process.pid}; setInterval(() => { try { process.kill(owner, 0); } catch { process.exit(0); } }, 250)`;
/** Every test here ends within this, even with a mutated Cleanup that never returns. */
const HARD_TIMEOUT_MS = 10_000;

/** Every process and folder a test made; the only targets anything here may touch. */
const made = { pids: [] as number[], folders: [] as string[] };

function isMine(target: number): boolean {
  return Number.isInteger(target) && Math.abs(target) > 1 && made.pids.includes(Math.abs(target));
}

/** The real effects, refusing any process or folder these tests didn't make. */
const guardedPorts: CleanupPorts = {
  kill: (target, signal) => {
    if (!isMine(target)) {
      throw new Error(`Test guard: refusing to signal ${target}`);
    }
    SYSTEM_PORTS.kill(target, signal);
  },
  listProcesses: () => SYSTEM_PORTS.listProcesses().filter(({ pid }) => isMine(pid)),
  removeDir: (path) => {
    if (!made.folders.includes(path)) {
      throw new Error(`Test guard: refusing to remove ${path}`);
    }
    SYSTEM_PORTS.removeDir(path);
  },
};

/** process.kill itself refuses foreign targets during these tests; signal 0 only asks. */
const realKill = process.kill.bind(process);
beforeAll(() => {
  process.kill = (target, signal) => {
    if (signal === 0 && target > 1) {
      return realKill(target, signal);
    }
    if (!isMine(target)) {
      throw new Error(`Test guard: refusing to signal ${target}`);
    }
    return realKill(target, signal);
  };
});
afterAll(() => {
  process.kill = realKill;
});

function isRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

afterEach(() => {
  for (const pid of made.pids) {
    // Only a pid that's still running can still be ours; a gone one may be reused.
    if (isRunning(pid)) {
      for (const target of [-pid, pid]) {
        try {
          guardedPorts.kill(target, "SIGKILL");
        } catch {
          // Its group is already gone: what the test wanted.
        }
      }
    }
  }
  // The test's own removal, not the code under test (a mutant may have broken
  // that): only the exact folders it made, by prefix, directly in a temp folder.
  for (const folder of made.folders) {
    const parent = realpathSync(dirname(folder));
    if (
      basename(folder).startsWith(TEMP_PREFIX) &&
      [realpathSync(tmpdir()), realpathSync("/tmp")].includes(parent) &&
      existsSync(folder)
    ) {
      rmSync(folder, { recursive: true, force: true });
    }
  }
  made.pids.length = 0;
  made.folders.length = 0;
});

/** A detached process in its own group, like the capture VS Code. */
function detached(code: string): ChildProcess {
  const child = spawn(process.execPath, ["-e", code], {
    detached: true,
    stdio: ["ignore", "pipe", "ignore"],
  });
  if (child.pid !== undefined) {
    made.pids.push(child.pid);
  }
  return child;
}

/** The first line the process prints. */
async function firstLine(child: ChildProcess): Promise<string> {
  return new Promise((resolve) => {
    child.stdout?.once("data", (chunk: Buffer) => resolve(chunk.toString().trim()));
  });
}

async function exitOf(child: ChildProcess): Promise<NodeJS.Signals | number | null> {
  if (child.exitCode !== null || child.signalCode !== null) {
    return child.signalCode ?? child.exitCode;
  }
  return new Promise((resolve) => child.once("exit", (code, signal) => resolve(signal ?? code)));
}

/** A run folder in the OS temp folder, standing in for the capture profile. */
function tempFolder(): string {
  const folder = mkdtempSync(join(tmpdir(), TEMP_PREFIX));
  writeFileSync(join(folder, "settings.json"), "{}");
  made.folders.push(folder);
  return folder;
}

interface RecorderArgs {
  processes?: { pid: number; command: string }[];
  /** The error every kill throws, if any. */
  killFails?: string;
}

/** Ports that only record what they're asked to do. */
function recorder({ processes = [], killFails = "" }: RecorderArgs = {}) {
  const calls: string[] = [];
  const ports: CleanupPorts = {
    kill: (target, signal) => {
      calls.push(`kill ${target} ${signal}`);
      if (killFails !== "") {
        throw new Error(killFails);
      }
    },
    listProcesses: () => {
      calls.push("list");
      return processes;
    },
    removeDir: (path) => {
      calls.push(`remove ${path}`);
    },
  };
  return { calls, ports };
}

describe("groupTarget", () => {
  it("negates a child's pid, so the signal reaches its whole group", () => {
    expect(groupTarget(4242)).toBe(-4242);
  });

  it("refuses 1, 0 and non-integers, which would signal every process or our own group", () => {
    expect(() => groupTarget(1)).toThrow("Refusing to signal group 1");
    expect(() => groupTarget(0)).toThrow("Refusing to signal group 0");
    expect(() => groupTarget(Number.NaN)).toThrow("Refusing to signal group NaN");
  });
});

describe("safeTemp", () => {
  it("accepts a run folder directly in the temp folders", () => {
    const folder = tempFolder();
    expect(safeTemp(folder)).toBe(folder);
  });

  it("accepts a run folder directly in /tmp, where the script puts its own", () => {
    const folder = mkdtempSync(join("/tmp", TEMP_PREFIX));
    made.folders.push(folder);
    expect(safeTemp(folder)).toBe(folder);
  });

  it.each([
    [
      "a relative path into the temp folder",
      relative(process.cwd(), join(tmpdir(), "toucan-shots-abc")),
    ],
    ["an empty path", ""],
    ["the root", "/"],
    ["a temp folder itself", tmpdir()],
    ["a relative path", "toucan-shots-abc"],
    ["the bare prefix", join(tmpdir(), "toucan-shots-")],
    ["another name", join(tmpdir(), "other-abc")],
    ["a run folder further down", join(tmpdir(), "x", "toucan-shots-abc")],
    ["a run folder elsewhere", "/opt/toucan-shots-abc"],
  ])("refuses %s", (_, path) => {
    expect(() => safeTemp(path)).toThrow(`Refusing to clean up ${JSON.stringify(path)}`);
  });
});

describe("parsePs", () => {
  it("reads pid and command from each line, skipping lines without a pid", () => {
    expect(
      parsePs("  PID COMMAND\n    1 /sbin/launchd\n 4242 node -e x y\n\n77   Code --flag\n"),
    ).toEqual([
      { pid: 1, command: "/sbin/launchd" },
      { pid: 4242, command: "node -e x y" },
      { pid: 77, command: "Code --flag" },
    ]);
  });
});

describe("the system ports", () => {
  it("list this very process among the running ones (ps is read-only)", () => {
    const self = SYSTEM_PORTS.listProcesses().find(({ pid }) => pid === process.pid);
    expect(self?.command.includes("node")).toBe(true);
  });

  it("refuse to signal -1, 0, 1 or a non-integer", () => {
    // Safe even with this guard mutated away: process.kill itself is guarded here.
    for (const target of [-1, 0, 1, Number.NaN]) {
      expect(() => SYSTEM_PORTS.kill(target, "SIGTERM")).toThrow(`Refusing to signal ${target}`);
    }
  });
});

describe("processesUsing", () => {
  it("picks the processes naming the run folder, never pid 1 or this one", () => {
    const temp = tempFolder();
    expect(
      processesUsing({
        temp,
        processes: [
          { pid: 1, command: `launchd ${temp}` },
          { pid: 50, command: `Code --user-data-dir ${temp}/data` },
          { pid: 51, command: "Code --user-data-dir /elsewhere" },
          { pid: 52, command: `node capture.mts ${temp}` },
        ],
        self: 52,
      }),
    ).toEqual([50]);
  });

  it("refuses a folder that isn't a run folder before looking at any process", () => {
    expect(() => processesUsing({ temp: "/", processes: [], self: 2 })).toThrow(
      'Refusing to clean up "/"',
    );
  });
});

describe("killGroup", () => {
  it("signals the group and stays quiet when it's already gone", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { calls, ports } = recorder({ killFails: "kill ESRCH" });
    killGroup({ pid: 4242, signal: "SIGTERM", ports });
    expect([calls, error.mock.calls.length]).toEqual([["kill -4242 SIGTERM"], 0]);
    error.mockRestore();
  });

  it("logs nothing when the signal goes through", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { calls, ports } = recorder();
    killGroup({ pid: 4242, signal: "SIGKILL", ports });
    expect([calls, error.mock.calls.length]).toEqual([["kill -4242 SIGKILL"], 0]);
    error.mockRestore();
  });

  it("reports any other failure", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { ports } = recorder({ killFails: "kill EPERM" });
    killGroup({ pid: 4242, signal: "SIGTERM", ports });
    expect(error.mock.calls).toEqual([["Couldn't stop VS Code: Error: kill EPERM"]]);
    error.mockRestore();
  });
});

describe("Cleanup with recorded effects", { timeout: HARD_TIMEOUT_MS }, () => {
  it("refuses a temp folder that isn't a run folder", () => {
    expect(() => new Cleanup({ temp: tmpdir(), ports: recorder().ports })).toThrow(
      `Refusing to clean up ${JSON.stringify(tmpdir())}`,
    );
  });

  it("abandons by killing the group, then any straggler, then removing the folder", () => {
    const temp = tempFolder();
    const child = detached(SLEEP);
    const { calls, ports } = recorder({
      processes: [
        { pid: 777, command: `Code --user-data-dir ${temp}/data` },
        { pid: 778, command: "Code --user-data-dir /elsewhere" },
      ],
    });
    const cleanup = new Cleanup({ temp, ports });
    cleanup.track(child);
    cleanup.abandon();
    expect(calls).toEqual([
      `kill -${child.pid} SIGKILL`,
      "list",
      "kill 777 SIGKILL",
      `remove ${temp}`,
    ]);
  });

  it("closes and abandons without signals when nothing is tracked", async () => {
    const temp = tempFolder();
    const { calls, ports } = recorder();
    const cleanup = new Cleanup({ temp, ports });
    cleanup.abandon();
    await cleanup.close();
    expect(calls).toEqual(["list", `remove ${temp}`, "list", `remove ${temp}`]);
  });

  it("closes without signals once the process was killed by a signal", async () => {
    const temp = tempFolder();
    const child = detached(SLEEP);
    guardedPorts.kill(child.pid ?? 0, "SIGKILL");
    expect(await exitOf(child)).toBe("SIGKILL");
    const { calls, ports } = recorder();
    const cleanup = new Cleanup({ temp, ports });
    cleanup.track(child);
    await cleanup.close();
    expect(calls).toEqual(["list", `remove ${temp}`]);
  });

  it("removes its signal and crash handlers on dispose", () => {
    const events = ["SIGINT", "SIGTERM", "SIGHUP", "uncaughtException"] as const;
    const before = events.map((event) => process.listenerCount(event));
    const cleanup = new Cleanup({ temp: tempFolder(), ports: recorder().ports });
    cleanup.handleExits();
    expect(events.map((event) => process.listenerCount(event))).toEqual(
      before.map((count) => count + 1),
    );
    cleanup.dispose();
    expect(events.map((event) => process.listenerCount(event))).toEqual(before);
  });

  it("closes without signals once the process has exited", async () => {
    const temp = tempFolder();
    const child = detached("");
    expect(await exitOf(child)).toBe(0);
    const { calls, ports } = recorder();
    const cleanup = new Cleanup({ temp, ports });
    cleanup.track(child);
    await cleanup.close();
    expect(calls).toEqual(["list", `remove ${temp}`]);
  });
});

describe("Cleanup with real processes", { timeout: HARD_TIMEOUT_MS }, () => {
  it("kills the whole group, grandchildren too, and removes the folder", async () => {
    const temp = tempFolder();
    // The child starts a grandchild in its own group, as VS Code starts its helpers.
    const child = detached(
      `const g = require("node:child_process").spawn(process.execPath, ["-e", ${JSON.stringify(SLEEP)}], { stdio: "ignore" }); console.log(g.pid); ${SLEEP};`,
    );
    const grandchild = Number(await firstLine(child));
    made.pids.push(grandchild);
    const cleanup = new Cleanup({ temp, ports: guardedPorts });
    cleanup.track(child);
    cleanup.abandon();
    expect(await exitOf(child)).toBe("SIGKILL");
    await expect.poll(() => isRunning(grandchild)).toBe(false);
    expect(existsSync(temp)).toBe(false);
  });

  it("stops the group gently on close", async () => {
    const temp = tempFolder();
    const child = detached(SLEEP);
    const cleanup = new Cleanup({ temp, ports: guardedPorts });
    cleanup.track(child);
    await cleanup.close();
    expect([child.signalCode, existsSync(temp)]).toEqual(["SIGTERM", false]);
  });

  it("kills a group that ignores SIGTERM once the grace period is over", async () => {
    const temp = tempFolder();
    const child = detached(`process.on("SIGTERM", () => {}); console.log("ready"); ${SLEEP};`);
    await firstLine(child);
    const cleanup = new Cleanup({ temp, graceMs: 100, ports: guardedPorts });
    cleanup.track(child);
    await cleanup.close();
    expect([child.signalCode, existsSync(temp)]).toEqual(["SIGKILL", false]);
  });
});

/**
 * Runs a harness that sets up a Cleanup with a run folder and a detached
 * sleeper, prints both, then ends however `end` says. The harness runs the
 * real Cleanup (and any active mutant), so it brings its own guarded ports and
 * process.kill: only its own sleeper's group, only its own folder.
 */
async function runHarness(end: string) {
  const script = `
    import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
    import { spawn } from "node:child_process";
    import { tmpdir } from "node:os";
    import { join } from "node:path";
    import { Cleanup } from ${JSON.stringify(CLEANUP)};
    const temp = mkdtempSync(join(tmpdir(), ${JSON.stringify(TEMP_PREFIX)}));
    writeFileSync(join(temp, "settings.json"), "{}");
    const child = spawn(process.execPath, ["-e", ${JSON.stringify(SLEEP)}], { detached: true, stdio: "ignore" });
    const isMine = (target) => Number.isInteger(target) && child.pid > 1 && Math.abs(target) === child.pid;
    const realKill = process.kill.bind(process);
    process.kill = (target, signal) => {
      if (signal === 0 && target > 1) return realKill(target, signal);
      if (!isMine(target)) throw new Error("Test guard: refusing to signal " + target);
      return realKill(target, signal);
    };
    const ports = {
      kill: (target, signal) => process.kill(target, signal),
      listProcesses: () => [],
      removeDir: (path) => {
        if (path !== temp) throw new Error("Test guard: refusing to remove " + path);
        rmSync(path, { recursive: true, force: true });
      },
    };
    const cleanup = new Cleanup({ temp, ports });
    cleanup.track(child);
    cleanup.handleExits();
    console.log(JSON.stringify({ pid: child.pid, temp }));
    ${SLEEP};
    ${end}
  `;
  const runner = spawn(process.execPath, ["--input-type=module", "-e", script], {
    stdio: ["ignore", "pipe", "ignore"],
  });
  if (runner.pid !== undefined) {
    made.pids.push(runner.pid);
  }
  const started = JSON.parse(await firstLine(runner)) as { pid: number; temp: string };
  made.pids.push(started.pid);
  made.folders.push(started.temp);
  return { runner, ...started };
}

describe("Cleanup on a signal or a crash", { timeout: HARD_TIMEOUT_MS }, () => {
  it.each(["SIGINT", "SIGTERM", "SIGHUP"] as const)(
    "leaves no process or folder behind when the run gets %s",
    async (signal) => {
      const { runner, pid, temp } = await runHarness("");
      const code = exitOf(runner);
      runner.kill(signal);
      expect(await code).toBe(EXIT_INTERRUPTED);
      expect([isRunning(pid), existsSync(temp)]).toEqual([false, false]);
    },
  );

  it("leaves no process or folder behind when the run throws", async () => {
    const { runner, pid, temp } = await runHarness(
      `setTimeout(() => { throw new Error("boom"); }, 50);`,
    );
    expect(await exitOf(runner)).toBe(1);
    expect([isRunning(pid), existsSync(temp)]).toEqual([false, false]);
  });
});
