// The screenshots script's view of running processes, from ps: every
// process's argv and `comm`, and one process read again right before a kill.
// import libraries
import { spawnSync } from "node:child_process";

// import utils
import { tryCatchSync } from "../../extension/src/shared/async/tryCatch.util.ts";
import { parsePs } from "./chrome.mts";

// import types
import type { KillPorts, RunningProcess } from "./chrome.mts";

/** One `ps -axo` listing, every process with the given columns. */
function ps(columns: string): string {
  return spawnSync("ps", ["-axo", columns], { encoding: "utf8" }).stdout ?? "";
}

interface PsOfArgs {
  pid: number;
  /** A `ps -o` column: comm or command. */
  column: string;
}

/** One process's `ps -o` column right now, or undefined when the process is gone. */
function psOf({ pid, column }: PsOfArgs): string | undefined {
  const result = spawnSync("ps", ["-p", String(pid), "-o", `${column}=`], { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : undefined;
}

/** The real effects of the last-moment check before a kill. */
export const KILL_PORTS: KillPorts = {
  readProcess: (pid) => {
    const program = psOf({ pid, column: "comm" });
    const command = psOf({ pid, column: "command" });
    return program === undefined || command === undefined ? undefined : { program, command };
  },
  kill: (pid) => {
    tryCatchSync(() => process.kill(pid, "SIGKILL"));
  },
};

/** The running processes from ps: each one's argv and the executable it runs. */
export function processes(): RunningProcess[] {
  return parsePs({ commands: ps("pid=,command="), programs: ps("pid=,comm=") });
}
