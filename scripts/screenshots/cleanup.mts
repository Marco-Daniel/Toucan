// What the README screenshot script leaves behind, however it ends: the
// capture VS Code (its whole process group, with its open debug ports) and the
// temp folder. Normal ends close VS Code gently; an interrupt, a signal or a
// crash kills it at once.
// import libraries
import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";

// import utils
import { errorText, tryCatchSync } from "../../src/shared/async/tryCatch.util.ts";

// import types
import type { ChildProcess } from "node:child_process";

const KILL_GRACE_MS = 3000;
/** The shell's exit status for a run ended by a signal: 128 + SIGINT. */
export const EXIT_INTERRUPTED = 130;
const SIGNALS = ["SIGINT", "SIGTERM", "SIGHUP"] as const;

/** Signals a whole process group; a group that's already gone is fine. */
export function killGroup({ pid, signal }: { pid: number; signal: NodeJS.Signals }): void {
  const [, error] = tryCatchSync(() => process.kill(-pid, signal));
  if (error !== null && !errorText(error).includes("ESRCH")) {
    console.error(`Couldn't stop VS Code: ${errorText(error)}`);
  }
}

function hasExited(child: ChildProcess): boolean {
  return child.exitCode !== null || child.signalCode !== null;
}

export class Cleanup {
  private readonly temp: string;
  private child: ChildProcess | undefined;
  private readonly signalHandlers: [NodeJS.Signals, NodeJS.SignalsListener][] = [];
  private crashHandler: ((error: Error) => void) | undefined;

  constructor(temp: string) {
    this.temp = temp;
  }

  /** The detached VS Code to end with everything else. */
  track(child: ChildProcess): void {
    this.child = child;
  }

  /** Ends VS Code's group gently (SIGKILL after a grace period) and removes the temp folder. */
  async close(): Promise<void> {
    const { child } = this;
    if (child?.pid !== undefined && !hasExited(child)) {
      const { pid } = child;
      const exited = new Promise<void>((resolve) => child.once("exit", () => resolve()));
      killGroup({ pid, signal: "SIGTERM" });
      const timer = setTimeout(() => killGroup({ pid, signal: "SIGKILL" }), KILL_GRACE_MS);
      await exited;
      clearTimeout(timer);
    }
    this.removeTemp();
  }

  /** Kills VS Code's group at once and removes the temp folder; safe to call from a handler. */
  abandon(): void {
    if (this.child?.pid !== undefined) {
      killGroup({ pid: this.child.pid, signal: "SIGKILL" });
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

  /**
   * Kills any process that still names the temp folder (every capture VS Code
   * process does), in case one ever started outside the tracked group, then
   * removes the folder.
   */
  private removeTemp(): void {
    spawnSync("pkill", ["-KILL", "-f", this.temp], { stdio: "ignore" });
    rmSync(this.temp, { recursive: true, force: true });
  }
}
