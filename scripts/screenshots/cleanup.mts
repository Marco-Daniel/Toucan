// What the README screenshot script leaves behind, however it ends: the
// capture VS Code (its whole process group, with its open debug ports) and the
// temp folder. Normal ends close VS Code gently; an interrupt, a signal or a
// crash kills it at once.
//
// Signals and deletes are dangerous here: process.kill(-1) reaches every
// process of the user, and a wrong path removes too much. So every target goes
// through a pure guard (groupTarget, safeTemp, processesUsing) right before
// use, and the effects themselves come in through ports the tests replace.
// import libraries
import { spawnSync } from "node:child_process";
import { realpathSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, isAbsolute } from "node:path";

// import utils
import { errorText, tryCatchSync } from "../../src/shared/async/tryCatch.util.ts";

// import types
import type { ChildProcess } from "node:child_process";

const KILL_GRACE_MS = 3000;
/** The shell's exit status for a run ended by a signal: 128 + SIGINT. */
export const EXIT_INTERRUPTED = 130;
const SIGNALS = ["SIGINT", "SIGTERM", "SIGHUP"] as const;
/** Every run's temp folder name starts with this; nothing else gets cleaned up. */
export const TEMP_PREFIX = "toucan-shots-";
/** Where temp folders may be: /tmp (short enough for VS Code's socket path) or the OS temp folder. */
const TEMP_PARENTS = ["/tmp", tmpdir()];

/**
 * The process.kill target for a child's whole group: its negated pid. Refuses
 * anything but a real child's pid, because process.kill(-1) signals every
 * process this user may signal, and -0 this process's own group.
 */
export function groupTarget(pid: number): number {
  if (!Number.isInteger(pid) || pid <= 1) {
    throw new Error(`Refusing to signal group ${pid}`);
  }
  return -pid;
}

/** A single process to signal: refuses -1, 0, 1 and non-integers, which reach every process or our own group. */
export function signalTarget(target: number): number {
  if (!Number.isInteger(target) || Math.abs(target) <= 1) {
    throw new Error(`Refusing to signal ${target}`);
  }
  return target;
}

/**
 * The temp folder, if it's safe to remove and to find processes by: absolute,
 * directly inside /tmp or the OS temp folder (compared by real path), and
 * named TEMP_PREFIX plus a suffix. Anything else throws.
 */
export function safeTemp(temp: string): string {
  const name = basename(temp);
  const [parent] = tryCatchSync(() => realpathSync(dirname(temp)));
  const parents = TEMP_PARENTS.flatMap((candidate) => {
    const [real] = tryCatchSync(() => realpathSync(candidate));
    return real ?? [];
  });
  if (
    !isAbsolute(temp) ||
    !name.startsWith(TEMP_PREFIX) ||
    name.length <= TEMP_PREFIX.length ||
    parent === null ||
    !parents.includes(parent)
  ) {
    throw new Error(`Refusing to clean up ${JSON.stringify(temp)}`);
  }
  return temp;
}

export interface RunningProcess {
  pid: number;
  command: string;
}

interface ProcessesUsingArgs {
  temp: string;
  processes: readonly RunningProcess[];
  /** This process, which is never a target. */
  self: number;
}

/**
 * The pids whose command line names the run's temp folder (every capture VS
 * Code process does), in case one ever started outside the tracked group.
 */
export function processesUsing({ temp, processes, self }: ProcessesUsingArgs): number[] {
  const folder = safeTemp(temp);
  return processes
    .filter(({ pid, command }) => pid > 1 && pid !== self && command.includes(folder))
    .map(({ pid }) => pid);
}

/** The effects Cleanup has on the system; tests replace them. */
export interface CleanupPorts {
  kill(target: number, signal: NodeJS.Signals): void;
  listProcesses(): RunningProcess[];
  removeDir(path: string): void;
}

const PS_LINE = /^\s*(\d+)\s+(.*)$/;

/** `ps -axo pid=,command=` output as processes; lines that don't parse are left out. */
export function parsePs(text: string): RunningProcess[] {
  return text.split("\n").flatMap((line) => {
    const [, pid = "", command = ""] = PS_LINE.exec(line) ?? [];
    return pid === "" ? [] : [{ pid: Number(pid), command }];
  });
}

/** The real effects, each re-checking its target right before use. */
export const SYSTEM_PORTS: CleanupPorts = {
  kill: (target, signal) => {
    process.kill(signalTarget(target), signal);
  },
  listProcesses: () =>
    parsePs(spawnSync("ps", ["-axo", "pid=,command="], { encoding: "utf8" }).stdout ?? ""),
  removeDir: (path) => {
    rmSync(safeTemp(path), { recursive: true, force: true });
  },
};

interface KillGroupArgs {
  pid: number;
  signal: NodeJS.Signals;
  ports?: CleanupPorts;
}

/** Signals a whole process group; a group that's already gone is fine. */
export function killGroup({ pid, signal, ports = SYSTEM_PORTS }: KillGroupArgs): void {
  const target = groupTarget(pid);
  const [, error] = tryCatchSync(() => ports.kill(target, signal));
  if (error !== null && !errorText(error).includes("ESRCH")) {
    console.error(`Couldn't stop VS Code: ${errorText(error)}`);
  }
}

function hasExited(child: ChildProcess): boolean {
  return child.exitCode !== null || child.signalCode !== null;
}

interface CleanupArgs {
  /** The run's temp folder; its unique path also identifies VS Code's processes. */
  temp: string;
  /** How long close() lets VS Code end before it kills it. */
  graceMs?: number;
  ports?: CleanupPorts;
}

export class Cleanup {
  private readonly temp: string;
  private readonly graceMs: number;
  private readonly ports: CleanupPorts;
  private child: ChildProcess | undefined;
  private readonly signalHandlers: [NodeJS.Signals, NodeJS.SignalsListener][] = [];
  private crashHandler: ((error: Error) => void) | undefined;

  constructor({ temp, graceMs = KILL_GRACE_MS, ports = SYSTEM_PORTS }: CleanupArgs) {
    this.temp = safeTemp(temp);
    this.graceMs = graceMs;
    this.ports = ports;
  }

  /** The detached VS Code to end with everything else. */
  track(child: ChildProcess): void {
    this.child = child;
  }

  /** Ends VS Code's group gently (SIGKILL after a grace period) and removes the temp folder. */
  async close(): Promise<void> {
    const { child, ports } = this;
    if (child?.pid !== undefined && !hasExited(child)) {
      const { pid } = child;
      const exited = new Promise<void>((resolve) => child.once("exit", () => resolve()));
      killGroup({ pid, signal: "SIGTERM", ports });
      const timer = setTimeout(() => killGroup({ pid, signal: "SIGKILL", ports }), this.graceMs);
      await exited;
      clearTimeout(timer);
    }
    this.removeTemp();
  }

  /** Kills VS Code's group at once and removes the temp folder; safe to call from a handler. */
  abandon(): void {
    const { child } = this;
    // Once VS Code has exited, its group id may belong to someone else.
    if (child?.pid !== undefined && !hasExited(child)) {
      killGroup({ pid: child.pid, signal: "SIGKILL", ports: this.ports });
    }
    this.removeTemp();
  }

  /**
   * Abandons on Ctrl-C, SIGTERM, SIGHUP or an uncaught exception, then exits.
   * VS Code runs in its own process group, so it never gets the terminal's
   * signals itself.
   */
  handleExits(): void {
    for (const signal of SIGNALS) {
      const handler = () => {
        console.error(`Stopped by ${signal}.`);
        this.abandon();
        process.exit(EXIT_INTERRUPTED);
      };
      process.once(signal, handler);
      this.signalHandlers.push([signal, handler]);
    }
    const crashed = (error: Error) => {
      console.error(errorText(error));
      this.abandon();
      process.exit(1);
    };
    process.once("uncaughtException", crashed);
    this.crashHandler = crashed;
  }

  /** Removes the handlers again once the run has ended normally. */
  dispose(): void {
    for (const [signal, handler] of this.signalHandlers.splice(0)) {
      process.off(signal, handler);
    }
    if (this.crashHandler) {
      process.off("uncaughtException", this.crashHandler);
      this.crashHandler = undefined;
    }
  }

  /** Kills any process still naming the temp folder, then removes the folder. */
  private removeTemp(): void {
    const { ports } = this;
    const stragglers = processesUsing({
      temp: this.temp,
      processes: ports.listProcesses(),
      self: process.pid,
    });
    for (const pid of stragglers) {
      tryCatchSync(() => ports.kill(pid, "SIGKILL"));
    }
    ports.removeDir(safeTemp(this.temp));
  }
}
