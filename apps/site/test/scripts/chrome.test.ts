// Pure guards only: nothing here signals a process or removes a folder.
// import libraries
import { afterEach, describe, expect, it, vi } from "vitest";

// import utils
import {
  chromePids,
  isProfileName,
  isRunBinary,
  parsePs,
  planSweep,
  runSweep,
} from "../../scripts/chrome.mts";

// import types
import type { EntryFacts, SweepPlan } from "../../scripts/chrome.mts";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const HELPER =
  "/Applications/Google Chrome.app/Contents/Frameworks/Google Chrome Framework.framework/Versions/154.0/Helpers/Google Chrome Helper.app/Contents/MacOS/Google Chrome Helper";
const PROFILE = "/var/tmp-real/toucan-site-shots-AbC123";

describe("parsePs", () => {
  it("joins each process's argv and executable on pid, skipping lines that don't parse", () => {
    expect(
      parsePs({
        commands: [
          "    1 /sbin/launchd",
          `  4300  ${CHROME} --headless=new --user-data-dir=${PROFILE}`,
          "  4400 tail -f log",
          "garbage line",
          "x 4700 not a line",
        ].join("\n"),
        programs: ["    1 /sbin/launchd", `  4300 ${CHROME}`, "garbage"].join("\n"),
      }),
    ).toEqual([
      { pid: 1, command: "/sbin/launchd", program: "/sbin/launchd" },
      {
        pid: 4300,
        command: `${CHROME} --headless=new --user-data-dir=${PROFILE}`,
        program: CHROME,
      },
      { pid: 4400, command: "tail -f log", program: "" },
    ]);
  });
});

describe("isRunBinary", () => {
  it.each([
    [CHROME, true],
    [HELPER, true],
    ["/Applications/Google Chrome.app/Contents/Frameworks/x/Helpers/chrome_crashpad_handler", true],
    ["/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary", false],
    ["/Applications/Google Chrome.appx/evil", false],
    ["/usr/bin/tail", false],
    ["Google Chrome", false],
    ["", false],
  ])("on macOS, %j: %s", (program, expected) => {
    expect(isRunBinary({ program, chrome: CHROME })).toBe(expected);
  });

  it.each([
    ["chromium-browse", true],
    ["chromium-browser", false],
    ["chromium", false],
    ["tail", false],
    ["", false],
  ])("on Linux, where ps cuts names to 15 characters, %j: %s", (program, expected) => {
    expect(isRunBinary({ program, chrome: "/usr/bin/chromium-browser" })).toBe(expected);
  });

  it("on Linux, takes a short name whole, or the exact path when ps shows one", () => {
    expect(isRunBinary({ program: "google-chrome", chrome: "/usr/bin/google-chrome" })).toBe(true);
    expect(
      isRunBinary({ program: "/usr/bin/google-chrome", chrome: "/usr/bin/google-chrome" }),
    ).toBe(true);
    expect(
      isRunBinary({ program: "/usr/local/bin/google-chrome", chrome: "/usr/bin/google-chrome" }),
    ).toBe(false);
  });
});

describe("chromePids", () => {
  it("picks this run's Chrome and its helpers, never a program that only names the profile", () => {
    const processes = [
      {
        pid: 4300,
        command: `${CHROME} --headless=new --user-data-dir=${PROFILE}`,
        program: CHROME,
      },
      {
        pid: 4301,
        command: `${HELPER} --type=renderer --user-data-dir=${PROFILE}`,
        program: HELPER,
      },
      { pid: 4400, command: `tail -f ${PROFILE}/chrome_debug.log`, program: "/usr/bin/tail" },
      { pid: 4401, command: `vim ${PROFILE}/Default/Preferences`, program: "/usr/bin/vim" },
      { pid: 4402, command: `grep -- --user-data-dir=${PROFILE}`, program: "/usr/bin/grep" },
      { pid: 4403, command: `grep chrome --color ${PROFILE}`, program: "/usr/bin/grep" },
      { pid: 4404, command: `pgrep -f ${PROFILE}`, program: "/usr/bin/pgrep" },
      { pid: 4500, command: `${CHROME} --user-data-dir=/opt/browser/profile`, program: CHROME },
    ];
    expect(chromePids({ processes, profile: PROFILE, chrome: CHROME, self: 4242 })).toEqual([
      4300, 4301,
    ]);
  });

  it("never picks pid 0 or 1, or this process, even running Chrome with the profile", () => {
    const processes = [0, 1, 4242, 4300].map((pid) => ({
      pid,
      command: `${CHROME} --user-data-dir=${PROFILE}`,
      program: CHROME,
    }));
    expect(chromePids({ processes, profile: PROFILE, chrome: CHROME, self: 4242 })).toEqual([4300]);
  });

  it.each([
    ["/opt/browser/profile"],
    ["/var/tmp-real/toucan-site-shots-"],
    ["/var/tmp-real/other-AbC123"],
  ])("refuses a profile that isn't one of the script's: %s", (profile) => {
    expect(() => chromePids({ processes: [], profile, chrome: CHROME, self: 4242 })).toThrow(
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
        { pid: 6900, command: "node --version", program: "node" },
        {
          pid: 7000,
          command: `tail -f ${TMP}/toucan-site-shots-InUse4/log`,
          program: "/usr/bin/tail",
        },
      ],
      chrome: CHROME,
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

  it("suspects only this binary running with a profile of ours that can't be found", () => {
    const gone = `${TMP}/toucan-site-shots-Gone11`;
    const processes = [
      { pid: 1, command: `${CHROME} --user-data-dir=${gone}`, program: CHROME },
      { pid: 8000, command: `${CHROME} --headless=new --user-data-dir=${gone}`, program: CHROME },
      {
        pid: 8001,
        command: `${HELPER} --user-data-dir=${TMP}/toucan-site-shots-Old111 --type=gpu`,
        program: HELPER,
      },
      {
        pid: 8002,
        command: `grep chrome --color --user-data-dir=${gone}`,
        program: "/usr/bin/grep",
      },
      { pid: 8003, command: `${CHROME} --user-data-dir=/opt/browser/profile`, program: CHROME },
      { pid: 8004, command: `${CHROME} --headless=new`, program: CHROME },
      { pid: 8005, command: "node --version", program: "node" },
    ];
    const plan = planSweep({
      names: [],
      tmp: TMP,
      processes,
      chrome: CHROME,
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
    suspects: [{ pid: 8000, command: "Google Chrome --headless=new", program: CHROME }],
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
