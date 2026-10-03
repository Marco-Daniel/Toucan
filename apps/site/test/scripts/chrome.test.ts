// Pure guards only: nothing here signals a process or removes a folder.
// import libraries
import { afterEach, describe, expect, it, vi } from "vitest";

// import utils
import { chromePids, isProfileName, parsePs, planSweep, runSweep } from "../../scripts/chrome.mts";

// import types
import type { EntryFacts, SweepPlan } from "../../scripts/chrome.mts";

const PROFILE = "/var/tmp-real/toucan-site-shots-AbC123";
const PS = [
  "    1 /sbin/launchd",
  "  4242 node scripts/screenshots.mts",
  "  4300 /Applications/Chrome --headless=new --user-data-dir=/var/tmp-real/toucan-site-shots-AbC123",
  "  4301 Chrome Helper --user-data-dir=/var/tmp-real/toucan-site-shots-AbC123 --type=renderer",
  "  4400 /Applications/Chrome --user-data-dir=/var/tmp-real/toucan-site-shots-Other9",
  "  4500 /Applications/Chrome --user-data-dir=/opt/browser/profile",
  "garbage line",
  "  4600  Chrome --user-data-dir=/var/tmp-real/toucan-site-shots-AbC123 --type=gpu",
  "x 4700 Chrome --user-data-dir=/var/tmp-real/toucan-site-shots-AbC123",
  "  4800 grep -- --user-data-dir=/var/tmp-real/toucan-site-shots-AbC123",
].join("\n");

describe("parsePs", () => {
  it("reads each pid and command, skipping lines that don't parse", () => {
    expect(parsePs(PS).map(({ pid }) => pid)).toEqual([
      1, 4242, 4300, 4301, 4400, 4500, 4600, 4800,
    ]);
    expect(parsePs(PS).find(({ pid }) => pid === 4600)?.command).toBe(
      "Chrome --user-data-dir=/var/tmp-real/toucan-site-shots-AbC123 --type=gpu",
    );
    expect(parsePs(PS)[2]?.command).toBe(
      "/Applications/Chrome --headless=new --user-data-dir=/var/tmp-real/toucan-site-shots-AbC123",
    );
  });
});

describe("chromePids", () => {
  it("picks only the processes naming this run's profile", () => {
    expect(chromePids({ processes: parsePs(PS), profile: PROFILE, self: 4242 })).toEqual([
      4300, 4301, 4600,
    ]);
  });

  it("never picks pid 0 or 1, or this process, even when they name the profile", () => {
    const processes = [
      { pid: 0, command: `Chrome --user-data-dir=${PROFILE}` },
      { pid: 1, command: `Chrome --user-data-dir=${PROFILE}` },
      { pid: 4242, command: `/usr/bin/google-chrome --user-data-dir=${PROFILE}` },
      { pid: 4300, command: `/usr/bin/chromium --user-data-dir=${PROFILE}` },
    ];
    expect(chromePids({ processes, profile: PROFILE, self: 4242 })).toEqual([4300]);
  });

  it("never picks a program that only quotes the profile, such as pgrep or grep", () => {
    const processes = [
      { pid: 4800, command: `pgrep -f ${PROFILE}` },
      { pid: 4801, command: `grep -- --user-data-dir=${PROFILE}` },
      { pid: 4802, command: `/bin/zsh -c ps | grep ${PROFILE}` },
      { pid: 4300, command: `Google Chrome --user-data-dir=${PROFILE}` },
    ];
    expect(chromePids({ processes, profile: PROFILE, self: 4242 })).toEqual([4300]);
  });

  it.each([
    ["/opt/browser/profile"],
    ["/var/tmp-real/toucan-site-shots-"],
    ["/var/tmp-real/other-AbC123"],
  ])("refuses a profile that isn't one of the script's: %s", (profile) => {
    expect(() => chromePids({ processes: parsePs(PS), profile, self: 4242 })).toThrow(
      `Refusing to stop processes for ${JSON.stringify(profile)}`,
    );
  });
});

describe("isProfileName", () => {
  it.each([
    ["toucan-site-shots-AbC123", true],
    ["toucan-site-shots-", false],
    ["toucan-shots-AbC123", false],
    ["x-toucan-site-shots-AbC123", false],
  ])("%s: %s", (name, expected) => {
    expect(isProfileName(name)).toBe(expected);
  });
});

const TMP = "/var/tmp-real";
const HOUR = 3_600_000;
const MAX_AGE = 300_000;
const ME = 501;

/** lstat facts for each test entry; anything not listed can't be read. */
function factsFrom(entries: Record<string, EntryFacts>) {
  return (path: string) => entries[path];
}

const OLD_MINE: EntryFacts = { isFolder: true, uid: ME, ageMs: HOUR };

describe("planSweep", () => {
  it("removes only an old folder of ours that no process names, and lists every other with its reason", () => {
    const plan = planSweep({
      names: [
        "toucan-site-shots-Old111",
        "toucan-site-shots-Young2",
        "toucan-site-shots-Link33",
        "toucan-site-shots-Theirs",
        "toucan-site-shots-InUse4",
        "toucan-site-shots-NoRead",
        "toucan-site-shots-",
        "other-folder",
      ],
      tmp: TMP,
      processes: [
        { pid: 6900, command: "node --version" },
        { pid: 7000, command: `Chrome --user-data-dir=${TMP}/toucan-site-shots-InUse4` },
      ],
      facts: factsFrom({
        [`${TMP}/toucan-site-shots-Old111`]: OLD_MINE,
        [`${TMP}/toucan-site-shots-Young2`]: { isFolder: true, uid: ME, ageMs: MAX_AGE },
        [`${TMP}/toucan-site-shots-Link33`]: { isFolder: false, uid: ME, ageMs: HOUR },
        [`${TMP}/toucan-site-shots-Theirs`]: { isFolder: true, uid: 502, ageMs: HOUR },
        [`${TMP}/toucan-site-shots-InUse4`]: OLD_MINE,
      }),
      uid: ME,
      maxAgeMs: MAX_AGE,
    });
    expect(plan.remove).toEqual([`${TMP}/toucan-site-shots-Old111`]);
    expect(plan.keep).toEqual([
      `${TMP}/toucan-site-shots-Young2 (may belong to a run that's still going)`,
      `${TMP}/toucan-site-shots-Link33 (isn't a folder)`,
      `${TMP}/toucan-site-shots-Theirs (belongs to another user)`,
      `${TMP}/toucan-site-shots-InUse4 (a process still names it)`,
      `${TMP}/toucan-site-shots-NoRead (can't be read)`,
    ]);
    expect(plan.suspects).toEqual([]);
  });

  it("suspects a Chrome program whose profile of ours can't be found, and nothing else", () => {
    const processes = [
      { pid: 1, command: `Chrome --user-data-dir=${TMP}/toucan-site-shots-Gone11` },
      {
        pid: 8000,
        command: `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome --headless=new --user-data-dir=${TMP}/toucan-site-shots-Gone11`,
      },
      { pid: 8001, command: `Chromium --user-data-dir=${TMP}/toucan-site-shots-Old111 --type=gpu` },
      { pid: 8002, command: `grep -- --user-data-dir=${TMP}/toucan-site-shots-Gone11` },
      { pid: 8003, command: `Chrome --user-data-dir=/opt/browser/profile` },
      { pid: 8004, command: "Google Chrome --headless=new" },
      { pid: 8005, command: "node --version" },
    ];
    const plan = planSweep({
      names: [],
      tmp: TMP,
      processes,
      facts: factsFrom({ [`${TMP}/toucan-site-shots-Old111`]: OLD_MINE }),
      uid: ME,
      maxAgeMs: MAX_AGE,
    });
    expect(plan.suspects.map(({ pid }) => pid)).toEqual([8000]);
  });
});

describe("runSweep", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  const plan: SweepPlan = {
    remove: [`${TMP}/toucan-site-shots-Old111`],
    keep: [`${TMP}/toucan-site-shots-Young2 (may belong to a run that's still going)`],
    suspects: [{ pid: 8000, command: "Google Chrome --headless=new" }],
  };

  it("removes what the plan says, lists the rest and the suspects, stops the run, and never signals a process", () => {
    // Throws if called, so the guard can't reach a real process even when it fails.
    const kill = vi.spyOn(process, "kill").mockImplementation(() => {
      throw new Error("runSweep must not signal a process");
    });
    const removed: string[] = [];
    const lines: string[] = [];
    const mayGoOn = runSweep({
      plan,
      removeDir: (path) => removed.push(path),
      report: (line) => lines.push(line),
    });
    expect(mayGoOn).toBe(false);
    expect(removed).toEqual([`${TMP}/toucan-site-shots-Old111`]);
    expect(lines).toEqual([
      `Left alone: ${TMP}/toucan-site-shots-Young2 (may belong to a run that's still going)`,
      "A Chrome from an earlier run may still be running. Check, stop it by hand if it's left over, and run again:",
      "  8000  Google Chrome --headless=new",
    ]);
    expect(kill).not.toHaveBeenCalled();
  });

  it("lets the run go on when no Chrome is suspect", () => {
    expect(
      runSweep({ plan: { ...plan, suspects: [] }, removeDir: () => {}, report: () => {} }),
    ).toBe(true);
  });
});
