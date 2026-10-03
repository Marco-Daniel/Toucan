// Pure guards only: nothing here signals a process or removes a folder.
// import libraries
import { describe, expect, it } from "vitest";

// import utils
import {
  chromePids,
  isProfileName,
  orphanPids,
  parsePs,
  staleProfiles,
} from "../../scripts/chrome.mts";

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
].join("\n");

describe("parsePs", () => {
  it("reads each pid and command, skipping lines that don't parse", () => {
    expect(parsePs(PS).map(({ pid }) => pid)).toEqual([1, 4242, 4300, 4301, 4400, 4500, 4600]);
    expect(parsePs(PS).at(-1)?.command).toBe(
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
      { pid: 0, command: `x ${PROFILE}` },
      { pid: 1, command: `x ${PROFILE}` },
      { pid: 4242, command: `node screenshots.mts ${PROFILE}` },
      { pid: 4300, command: `chrome ${PROFILE}` },
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

describe("staleProfiles", () => {
  it("lists the script's profiles no process uses, and nothing else", () => {
    expect(
      staleProfiles({
        names: [
          "toucan-site-shots-AbC123",
          "toucan-site-shots-Gone11",
          "toucan-site-shots-",
          "other",
          "toucan-site-shots-Other9",
        ],
        tmp: "/var/tmp-real",
        processes: parsePs(PS),
      }),
    ).toEqual(["/var/tmp-real/toucan-site-shots-Gone11"]);
  });
});

describe("orphanPids", () => {
  const processes = [
    { pid: 1, command: "x --user-data-dir=/var/tmp-real/toucan-site-shots-Gone11" },
    { pid: 4242, command: "node --user-data-dir=/var/tmp-real/toucan-site-shots-Gone11" },
    {
      pid: 5000,
      command: "Chrome --headless=new --user-data-dir=/var/tmp-real/toucan-site-shots-Gone11",
    },
    {
      pid: 5001,
      command: "Chrome Helper --user-data-dir=/var/tmp-real/toucan-site-shots-Gone11 --type=gpu",
    },
    { pid: 5100, command: "Chrome --user-data-dir=/var/tmp-real/toucan-site-shots-Live22" },
    { pid: 5200, command: "Chrome --user-data-dir=/opt/browser/gone-profile" },
    { pid: 5300, command: "Chrome --no-profile-flag" },
  ];

  it("picks the Chromes whose script profile is gone, never pid 1, this process, a live run or another profile", () => {
    expect(
      orphanPids({
        processes,
        exists: (path) => path === "/var/tmp-real/toucan-site-shots-Live22",
        self: 4242,
      }),
    ).toEqual([5000, 5001]);
  });
});
