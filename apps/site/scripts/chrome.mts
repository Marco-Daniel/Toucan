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

interface StaleProfilesArgs {
  /** The temp folder's entries. */
  names: readonly string[];
  /** The temp folder, absolute and resolved. */
  tmp: string;
  processes: readonly RunningProcess[];
}

/** The script's profiles in the temp folder that no running process names: left by a run that was killed. */
export function staleProfiles({ names, tmp, processes }: StaleProfilesArgs): string[] {
  return names
    .filter(isProfileName)
    .map((name) => join(tmp, name))
    .filter((profile) => !processes.some(({ command }) => command.includes(profile)));
}

interface OrphanPidsArgs {
  processes: readonly RunningProcess[];
  /** Whether a folder still exists. */
  exists: (path: string) => boolean;
  /** This process, never a target. */
  self: number;
}

/**
 * The pids of a Chrome some earlier run left behind: processes whose
 * --user-data-dir is one of the script's profiles that no longer exists, so
 * no run owns them any more. Never pid 0 or 1, never this process.
 */
export function orphanPids({ processes, exists, self }: OrphanPidsArgs): number[] {
  return processes
    .filter(({ pid, command }) => {
      const profile = /--user-data-dir=(\S+)/.exec(command)?.[1];
      return (
        pid > 1 &&
        pid !== self &&
        profile !== undefined &&
        isProfileName(basename(profile)) &&
        !exists(profile)
      );
    })
    .map(({ pid }) => pid);
}
