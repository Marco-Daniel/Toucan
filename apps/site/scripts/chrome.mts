// What the screenshots script may stop and remove, decided without touching
// anything: the Chrome processes of its own temporary profile, and leftover
// profiles no process uses any more. Pure, so the guards are tested.
// import libraries
import { basename, join } from "node:path";

/** Every profile folder the script makes starts with this; nothing else is ever stopped or removed. */
export const PROFILE_PREFIX = "toucan-site-shots-";

/** Whether a folder name is one of the script's profiles: the prefix and a suffix. */
export function isProfileName(name: string): boolean {
  return name.startsWith(PROFILE_PREFIX) && name.length > PROFILE_PREFIX.length;
}

/** Linux's `ps -o comm` shows the executable's name cut to this many characters. */
const LINUX_COMM_LENGTH = 15;

/** A running process: its argv, and the executable it runs (`ps -o comm`). */
export interface RunningProcess {
  pid: number;
  command: string;
  /** The full path on macOS; the name, cut to 15 characters, on Linux. */
  program: string;
}

/** The `pid=, rest` lines of a ps listing, by pid; lines that don't parse are left out. */
function psColumn(text: string): Map<number, string> {
  return new Map(
    text.split("\n").flatMap((line) => {
      const [, pid = "", rest = ""] = /^\s*(\d+)\s+(.*)$/.exec(line) ?? [];
      return pid === "" ? [] : [[Number(pid), rest] as const];
    }),
  );
}

interface ParsePsArgs {
  /** `ps -axo pid=,command=` output. */
  commands: string;
  /** `ps -axo pid=,comm=` output. */
  programs: string;
}

/** The processes in two ps listings, joined on pid; one missing from the second has an empty program. */
export function parsePs({ commands, programs }: ParsePsArgs): RunningProcess[] {
  const byPid = psColumn(programs);
  return [...psColumn(commands)].map(([pid, command]) => ({
    pid,
    command,
    program: byPid.get(pid) ?? "",
  }));
}

interface IsRunBinaryArgs {
  /** The process's executable, from `ps -o comm`. */
  program: string;
  /** The Chrome executable the run started. */
  chrome: string;
}

/**
 * Whether a process runs the Chrome this run started, judged by its
 * executable, never by its argv (a `tail`, `vim` or `grep` can name the
 * profile too). On macOS: that exact path, or one inside the same `.app`
 * bundle (its helpers). On Linux, where ps cuts the name: the same cut name.
 */
export function isRunBinary({ program, chrome }: IsRunBinaryArgs): boolean {
  const bundle = /^(.*?\.app)\//.exec(chrome)?.[1];
  if (bundle !== undefined) {
    return program === chrome || program.startsWith(`${bundle}/`);
  }
  if (program.includes("/")) {
    return program === chrome;
  }
  return program !== "" && program === basename(chrome).slice(0, LINUX_COMM_LENGTH);
}

interface ChromePidsArgs {
  processes: readonly RunningProcess[];
  /** The run's profile folder, absolute. */
  profile: string;
  /** The Chrome executable the run started. */
  chrome: string;
  /** This process, never a target. */
  self: number;
}

/**
 * The pids to stop: processes running this run's Chrome binary whose argv
 * names its profile. Never pid 0 or 1 (process.kill would reach every
 * process), never this process, and nothing at all for a folder that isn't
 * one of the script's.
 */
export function chromePids({ processes, profile, chrome, self }: ChromePidsArgs): number[] {
  if (!isProfileName(basename(profile))) {
    throw new Error(`Refusing to stop processes for ${JSON.stringify(profile)}`);
  }
  return processes
    .filter(
      ({ pid, command, program }) =>
        pid > 1 && pid !== self && isRunBinary({ program, chrome }) && command.includes(profile),
    )
    .map(({ pid }) => pid);
}

/** What the sweep knows about an entry in the temp folder, from lstat. */
export interface EntryFacts {
  /** A real folder: not a symlink, not a file. */
  isFolder: boolean;
  /** Its owner's user id. */
  uid: number;
  /** How long ago it was last changed. */
  ageMs: number;
}

interface SweepArgs {
  /** The temp folder's entries. */
  names: readonly string[];
  /** The temp folder, absolute and resolved. */
  tmp: string;
  processes: readonly RunningProcess[];
  /** The Chrome executable runs start. */
  chrome: string;
  /** lstat of an entry, or undefined when it can't be read. */
  facts: (path: string) => EntryFacts | undefined;
  /** This user's id. */
  uid: number;
  /** How long a run can last: anything younger may belong to a run that's starting. */
  maxAgeMs: number;
}

/** What the start-up sweep found: what it may remove, and what it leaves for a person to look at. */
export interface SweepPlan {
  /** Profiles of ours that no run can own any more. */
  remove: string[];
  /** Profiles it won't touch, and why. */
  keep: string[];
  /** Chrome processes that may be left over from an earlier run, which nothing stops automatically. */
  suspects: RunningProcess[];
}

/**
 * Plans the start-up sweep, without touching anything. A profile is removed
 * only when it is older than a run can last, named by no process, a real
 * folder and ours; any other is kept and listed. Leftover Chromes are only
 * reported: a missing profile doesn't prove nobody owns the process.
 */
export function planSweep({
  names,
  tmp,
  processes,
  chrome,
  facts,
  uid,
  maxAgeMs,
}: SweepArgs): SweepPlan {
  const remove: string[] = [];
  const keep: string[] = [];
  for (const name of names.filter(isProfileName)) {
    const profile = join(tmp, name);
    const entry = facts(profile);
    const reason =
      entry === undefined
        ? "can't be read"
        : !entry.isFolder
          ? "isn't a folder"
          : entry.uid !== uid
            ? "belongs to another user"
            : entry.ageMs <= maxAgeMs
              ? "may belong to a run that's still going"
              : processes.some(({ command }) => command.includes(profile))
                ? "a process still names it"
                : undefined;
    if (reason === undefined) {
      remove.push(profile);
    } else {
      keep.push(`${profile} (${reason})`);
    }
  }
  const suspects = processes.filter(({ pid, command, program }) => {
    const profile = / --user-data-dir=(.+?)(?= --|$)/.exec(command)?.[1];
    return (
      pid > 1 &&
      isRunBinary({ program, chrome }) &&
      profile !== undefined &&
      isProfileName(basename(profile)) &&
      facts(profile) === undefined
    );
  });
  return { remove, keep, suspects };
}

interface RunSweepArgs {
  plan: SweepPlan;
  removeDir: (path: string) => void;
  report: (line: string) => void;
}

/**
 * Carries out a sweep plan: removes the profiles it may, lists what it keeps,
 * and lists any suspect Chrome for a person to stop. It never signals a
 * process. Returns whether the run may go on: not while a suspect runs.
 */
export function runSweep({ plan, removeDir, report }: RunSweepArgs): boolean {
  for (const profile of plan.remove) {
    removeDir(profile);
  }
  for (const kept of plan.keep) {
    report(`Left alone: ${kept}`);
  }
  if (plan.suspects.length === 0) {
    return true;
  }
  report(
    "A Chrome from an earlier run may still be running. Check, stop it by hand if it's left over, and run again:",
  );
  for (const { pid, command } of plan.suspects) {
    report(`  ${pid}  ${command}`);
  }
  return false;
}
