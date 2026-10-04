// import libraries
import { describe, expect, it } from "vitest";

// import utils
import { changelogMarkdown, whatsNew } from "../src/changelog.util.ts";

const NOTES = `Toucan 0.0.4 fixes two things.

## Fixed

- **One.** ([#12](https://github.com/Marco-Daniel/Toucan/pull/12))

## Install

Download \`toucan-0.0.4.vsix\` below.

SHA-256: \`abc\`

## Install again, a later heading

kept out too`;

describe("whatsNew", () => {
  it("is the notes before their install steps, trimmed", () => {
    expect(whatsNew(NOTES)).toBe(
      "Toucan 0.0.4 fixes two things.\n\n## Fixed\n\n- **One.** ([#12](https://github.com/Marco-Daniel/Toucan/pull/12))",
    );
  });

  it("is all of the notes, trimmed, when they have no install steps", () => {
    expect(whatsNew("\n  Only news.\n\n## Changed\n\n- x\n")).toBe(
      "Only news.\n\n## Changed\n\n- x",
    );
  });

  it("keeps a smaller Install heading, which isn't the install steps", () => {
    expect(whatsNew("News.\n\n### Install tips\n\nStill news.\n\n## Install\n\nsteps")).toBe(
      "News.\n\n### Install tips\n\nStill news.",
    );
  });

  it("doesn't take a heading that only starts like Install", () => {
    expect(whatsNew("News.\n\n## Installer\n\nStill news.")).toBe(
      "News.\n\n## Installer\n\nStill news.",
    );
  });
});

const release = (tag: string, publishedAt: string, body: string) => ({
  tag,
  name: tag,
  publishedAt,
  url: `https://github.com/Marco-Daniel/Toucan/releases/tag/${tag}`,
  body,
});

describe("changelogMarkdown", () => {
  const releases = [
    release(
      "v0.0.2",
      "2026-10-02T10:51:58Z",
      "Second.\n\n## Fixed\n\n### Detail\n\n- #12 stays\n\n## Install\n\nsteps",
    ),
    release("v0.0.1", "2026-10-02T06:21:23Z", "First."),
  ];

  it("lists the upcoming version first, then each release with its link and date, each one's headings a level down", () => {
    expect(
      changelogMarkdown({
        releases,
        upcoming: { version: "1.0.0", notes: "Launch.\n\n## New\n\n## Install\n\nx" },
      }),
    ).toBe(`# Changelog

Toucan's releases, newest first. Each one's full notes, with the install steps and the VSIX's SHA-256, are on its GitHub release.

## 1.0.0

Launch.

### New

## [0.0.2](https://github.com/Marco-Daniel/Toucan/releases/tag/v0.0.2) (2026-10-02)

Second.

### Fixed

#### Detail

- #12 stays

## [0.0.1](https://github.com/Marco-Daniel/Toucan/releases/tag/v0.0.1) (2026-10-02)

First.
`);
  });

  it("lists only the releases without an upcoming version", () => {
    expect(changelogMarkdown({ releases: releases.slice(1) })).toBe(`# Changelog

Toucan's releases, newest first. Each one's full notes, with the install steps and the VSIX's SHA-256, are on its GitHub release.

## [0.0.1](https://github.com/Marco-Daniel/Toucan/releases/tag/v0.0.1) (2026-10-02)

First.
`);
  });

  it("moves only headings down, and keeps a tag's letters past its leading v", () => {
    expect(
      changelogMarkdown({
        releases: [release("2.0.0-dev", "2026-11-01T00:00:00Z", "Uses C# and #12 notes.")],
      }),
    ).toContain(
      "## [2.0.0-dev](https://github.com/Marco-Daniel/Toucan/releases/tag/2.0.0-dev) (2026-11-01)\n\nUses C# and #12 notes.\n",
    );
  });

  it("refuses an upcoming version that's already released", () => {
    expect(() =>
      changelogMarkdown({ releases, upcoming: { version: "0.0.2", notes: "Again." } }),
    ).toThrow("v0.0.2 is already released");
  });
});
