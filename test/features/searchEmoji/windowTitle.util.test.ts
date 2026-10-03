// import libraries
import { describe, expect, it } from "vitest";

// import utils
import {
  searchEmojiStep,
  shouldLabel,
  titleToRestore,
  titleValues,
  titleWithRepoVariable,
  unappliedChange,
  withEmojiSlot,
} from "../../../src/features/searchEmoji/windowTitle.util.ts";

const DEFAULT = "${dirty}${activeEditorShort}${separator}${rootName}${separator}${appName}";

describe("titleWithRepoVariable", () => {
  it("puts the repository variable in front and the emoji slot before the folder name", () => {
    expect(titleWithRepoVariable(DEFAULT)).toBe(
      "${activeRepositoryName}${dirty}${activeEditorShort}${separator}${toucanRepoEmoji}${rootName}${separator}${appName}",
    );
  });

  it("adds only the repository variable to a title without a folder name", () => {
    expect(titleWithRepoVariable("${activeEditorShort}")).toBe(
      "${activeRepositoryName}${activeEditorShort}",
    );
  });

  it("needs no change when the variable is already there", () => {
    expect(titleWithRepoVariable("${rootName} ${activeRepositoryName}")).toBeUndefined();
  });
});

describe("titleToRestore", () => {
  const written = `\${activeRepositoryName}\${separator}${DEFAULT}`;

  it("restores the previous value while the title is still Toucan's", () => {
    expect(
      titleToRestore({ change: { previous: "${rootName}", written }, current: written }),
    ).toEqual({
      restore: true,
      value: "${rootName}",
    });
  });

  it("restores an unset title as unset", () => {
    expect(titleToRestore({ change: { previous: undefined, written }, current: written })).toEqual({
      restore: true,
      value: undefined,
    });
  });

  it("restores a title Toucan gave the emoji slot but didn't record yet", () => {
    const older = "${activeRepositoryName}${rootName}";
    expect(
      titleToRestore({
        change: { previous: "${rootName}", written: older },
        current: "${activeRepositoryName}${toucanRepoEmoji}${rootName}",
      }),
    ).toEqual({ restore: true, value: "${rootName}" });
  });

  it("keeps the user's own edit", () => {
    expect(
      titleToRestore({ change: { previous: undefined, written }, current: "${rootName} edited" }),
    ).toEqual({
      restore: false,
    });
  });

  it("has nothing to restore when Toucan changed nothing", () => {
    expect(titleToRestore({ change: { previous: "x", written: undefined }, current: "x" })).toEqual(
      { restore: false },
    );
  });
});

describe("withEmojiSlot", () => {
  it("puts the slot in front of the first folder name only", () => {
    expect(withEmojiSlot("${activeRepositoryName}${rootName} (${rootName})")).toBe(
      "${activeRepositoryName}${toucanRepoEmoji}${rootName} (${rootName})",
    );
  });

  it("leaves a title that has the slot, or no folder name", () => {
    expect(withEmojiSlot("${toucanRepoEmoji}${rootName}")).toBe("${toucanRepoEmoji}${rootName}");
    expect(withEmojiSlot("${activeEditorShort}")).toBe("${activeEditorShort}");
  });
});

describe("titleValues", () => {
  const repo = { name: "webshop", emoji: "🟦" };
  const toucans = {
    previous: undefined,
    written: "${activeRepositoryName}${toucanRepoEmoji}${rootName}",
  };

  it("puts the emoji in front while an editor is open", () => {
    expect(titleValues({ change: toucans, repo, hasEditor: true })).toEqual({
      lead: "🟦 ",
      beforeRoot: "",
    });
  });

  it("moves the emoji to the folder name while no editor is open", () => {
    expect(titleValues({ change: toucans, repo, hasEditor: false })).toEqual({
      lead: "",
      beforeRoot: "🟦 ",
    });
  });

  it("keeps the emoji in front in a title written before the slot existed", () => {
    const older = { previous: undefined, written: "${activeRepositoryName}${rootName}" };
    expect(titleValues({ change: older, repo, hasEditor: false })).toEqual({
      lead: "🟦 ",
      beforeRoot: "",
    });
  });

  it("shows nothing for a repo without a color", () => {
    expect(titleValues({ change: toucans, repo: undefined, hasEditor: false })).toEqual({
      lead: "",
      beforeRoot: "",
    });
  });

  it("is emoji and name when the user's own title uses the variable", () => {
    const own = { previous: "y", written: undefined };
    expect(titleValues({ change: own, repo, hasEditor: false })).toEqual({
      lead: "🟦 webshop",
      beforeRoot: "",
    });
    expect(titleValues({ change: own, repo: undefined, hasEditor: true })).toBeUndefined();
  });
});

describe("searchEmojiStep", () => {
  const change = { previous: undefined, written: "${activeRepositoryName}${rootName}" };

  it("asks in the focused window when turned on with nothing recorded", () => {
    expect(searchEmojiStep({ enabled: true, focused: true, change: undefined })).toBe("ask");
  });

  it("restores in the focused window when turned off with a change recorded", () => {
    expect(searchEmojiStep({ enabled: false, focused: true, change })).toBe("restore");
  });

  it("does nothing global in an unfocused window", () => {
    expect(searchEmojiStep({ enabled: true, focused: false, change: undefined })).toBe("none");
    expect(searchEmojiStep({ enabled: false, focused: false, change })).toBe("none");
  });

  it("does nothing once the state matches the setting", () => {
    expect(searchEmojiStep({ enabled: true, focused: true, change })).toBe("none");
    expect(searchEmojiStep({ enabled: false, focused: true, change: undefined })).toBe("none");
  });
});

describe("shouldLabel", () => {
  it("labels only while on and consented", () => {
    const change = { previous: undefined, written: undefined };
    expect(shouldLabel({ enabled: true, change })).toBe(true);
    expect(shouldLabel({ enabled: true, change: undefined })).toBe(false);
    expect(shouldLabel({ enabled: false, change })).toBe(false);
  });
});

describe("unappliedChange", () => {
  const written = "${activeRepositoryName}${rootName}";
  const now = 1_000_000;
  const longAgo = now - 30_001;

  it("drops a pending change older than 30 s whose title write never happened", () => {
    expect(
      unappliedChange({
        change: { previous: undefined, written, pendingSince: longAgo },
        currentTitle: undefined,
        now,
      }),
    ).toBe(true);
    expect(
      unappliedChange({
        change: { previous: "${rootName}", written, pendingSince: longAgo },
        currentTitle: "${rootName}",
        now,
      }),
    ).toBe(true);
  });

  it("keeps a recent pending change: its write may still be under way", () => {
    expect(
      unappliedChange({
        change: { previous: undefined, written, pendingSince: now - 30_000 },
        currentTitle: undefined,
        now,
      }),
    ).toBe(false);
  });

  it("never drops a settled change, even when this window's title view lags", () => {
    expect(
      unappliedChange({ change: { previous: undefined, written }, currentTitle: undefined, now }),
    ).toBe(false);
  });

  it("keeps a pending change whose title was written, or that needed no write", () => {
    expect(
      unappliedChange({
        change: { previous: undefined, written, pendingSince: longAgo },
        currentTitle: written,
        now,
      }),
    ).toBe(false);
    expect(
      unappliedChange({
        change: { previous: "x", written: undefined, pendingSince: longAgo },
        currentTitle: "x",
        now,
      }),
    ).toBe(false);
  });
});
