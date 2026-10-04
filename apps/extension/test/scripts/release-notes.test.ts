// import libraries
import { describe, expect, it } from "vitest";

// import utils
import {
  filledReleaseNotes,
  releaseNotesProblems,
  SHA256_PLACEHOLDER,
} from "../../scripts/release-notes.mts";

const NOTES = `Toucan 1.0.0 is on the Marketplace.

## Install

Download \`toucan-1.0.0.vsix\` below.

SHA-256: \`{{sha256}}\`
`;
const SHA = "b139e00ef4d07559000a57c7237c4c9804e6c71152cc6399ab112511f69377d5";

describe("releaseNotesProblems", () => {
  it("finds none in notes for this version, with install steps and one placeholder", () => {
    expect(releaseNotesProblems({ notes: NOTES, version: "1.0.0" })).toEqual([]);
  });

  it("names each problem: another version's VSIX, no install steps, no placeholder", () => {
    expect(
      releaseNotesProblems({
        notes: "Toucan 0.0.4.\n\nDownload toucan-0.0.4.vsix.",
        version: "1.0.0",
      }),
    ).toEqual([
      "they don't name toucan-1.0.0.vsix, the VSIX of version 1.0.0",
      "they have no ## Install section",
      "they have 0 {{sha256}} placeholders, not 1",
      "they have no line SHA-256: `{{sha256}}`",
    ]);
  });

  it("doesn't take a smaller Install heading as the install steps", () => {
    expect(
      releaseNotesProblems({ notes: NOTES.replace("## Install", "### Install"), version: "1.0.0" }),
    ).toEqual(["they have no ## Install section"]);
  });

  it("refuses a placeholder outside the checksum line", () => {
    expect(
      releaseNotesProblems({
        notes: NOTES.replace("SHA-256: `{{sha256}}`", "Checksum {{sha256}}"),
        version: "1.0.0",
      }),
    ).toEqual(["they have no line SHA-256: `{{sha256}}`"]);
  });

  it("refuses two placeholders, and an Install heading that isn't one", () => {
    expect(
      releaseNotesProblems({
        notes: `toucan-1.0.0.vsix\n\n## Installer\n\n${SHA256_PLACEHOLDER} ${SHA256_PLACEHOLDER}`,
        version: "1.0.0",
      }),
    ).toEqual([
      "they have no ## Install section",
      "they have 2 {{sha256}} placeholders, not 1",
      "they have no line SHA-256: `{{sha256}}`",
    ]);
  });
});

describe("filledReleaseNotes", () => {
  it("puts the SHA-256 in place of the placeholder", () => {
    expect(filledReleaseNotes({ notes: NOTES, sha256: SHA })).toBe(
      NOTES.replace("{{sha256}}", SHA),
    );
    expect(filledReleaseNotes({ notes: NOTES, sha256: SHA })).toContain(`SHA-256: \`${SHA}\``);
  });

  it.each([
    [0, "No checksum yet."],
    [2, `${SHA256_PLACEHOLDER} and ${SHA256_PLACEHOLDER}`],
  ])("refuses notes with %i placeholders, filling in none", (count, notes) => {
    expect(() => filledReleaseNotes({ notes, sha256: SHA })).toThrow(
      `The notes have ${count} {{sha256}} placeholders, not 1`,
    );
  });

  it.each([["ABC"], [SHA.toUpperCase()], [`${SHA}0`], [""]])(
    "refuses %j, which isn't a lower-case SHA-256",
    (sha256) => {
      expect(() => filledReleaseNotes({ notes: NOTES, sha256 })).toThrow(
        `Not a SHA-256: ${JSON.stringify(sha256)}`,
      );
    },
  );
});
