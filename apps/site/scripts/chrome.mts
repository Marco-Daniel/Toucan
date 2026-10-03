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

interface RunningProcess {
  pid: number;
  command: string;
}

/** `ps -axo pid=,command=` output as processes; lines that don't parse are left out. */
export function parsePs(text: string): RunningProcess[] {
  return text.split("\n").flatMap((line) => {
    const [, pid = "", command = ""] = /^\s*(\d+)\s+(.*)$/.exec(line) ?? [];
    return pid === "" ? [] : [{ pid: Number(pid), command }];
  });
}

interface ChromePidsArgs {
  processes: readonly RunningProcess[];
  /** The run's profile folder, absolute. */
  profile: string;
  /** This process, never a target. */
  self: number;
}

/**
 * The pids to stop: processes whose command line names the run's profile.
 * Never pid 0 or 1 (process.kill would reach every process), never this
 * process, and nothing at all for a folder that isn't one of the script's.
 */
export function chromePids({ processes, profile, self }: ChromePidsArgs): number[] {
  if (!isProfileName(basename(profile))) {
    throw new Error(`Refusing to stop processes for ${JSON.stringify(profile)}`);
  }
  return processes
    .filter(({ pid, command }) => pid > 1 && pid !== self && command.includes(profile))
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
export function planSweep({ names, tmp, processes, facts, uid, maxAgeMs }: SweepArgs): SweepPlan {
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
  const suspects = processes.filter(({ pid, command }) => {
    const program = command.split(" --")[0] ?? "";
    const profile = / --user-data-dir=(.+?)(?= --|$)/.exec(command)?.[1];
    return (
      pid > 1 &&
      /Chrom(e|ium)/.test(basename(program)) &&
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
