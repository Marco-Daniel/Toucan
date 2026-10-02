// import libraries
import { describe, expect, it } from "vitest";

// import utils
import {
  repoVariableValue,
  searchEmojiStep,
  shouldLabel,
  titleToRestore,
  titleWithRepoVariable,
  unappliedChange,
} from "../../../src/features/searchEmoji/windowTitle.util.ts";

const DEFAULT = "${dirty}${activeEditorShort}${separator}${rootName}${separator}${appName}";

describe("titleWithRepoVariable", () => {
  it("puts the repository variable in front", () => {
    expect(titleWithRepoVariable(DEFAULT)).toBe(`\${activeRepositoryName}${DEFAULT}`);
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

describe("repoVariableValue", () => {
  const repo = { name: "webshop", emoji: "🟦" };

  it("is the emoji and a space when Toucan added the variable", () => {
    expect(repoVariableValue({ change: { previous: undefined, written: "x" }, repo })).toBe("🟦 ");
    expect(
      repoVariableValue({ change: { previous: undefined, written: "x" }, repo: undefined }),
    ).toBe("");
  });

  it("is emoji and name when the user's own title uses the variable", () => {
    expect(repoVariableValue({ change: { previous: "y", written: undefined }, repo })).toBe(
      "🟦 webshop",
    );
    expect(
      repoVariableValue({ change: { previous: "y", written: undefined }, repo: undefined }),
    ).toBeUndefined();
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
