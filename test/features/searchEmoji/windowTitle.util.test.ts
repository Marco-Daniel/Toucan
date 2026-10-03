// import libraries
import { describe, expect, it } from "vitest";

// import utils
import {
  currentForm,
  searchEmojiStep,
  shouldLabel,
  titleToRestore,
  titleValues,
  titleWithEmoji,
  unappliedChange,
  withEmojiSlot,
  writtenForms,
} from "../../../src/features/searchEmoji/windowTitle.util.ts";

const DEFAULT = "${dirty}${activeEditorShort}${separator}${rootName}${separator}${appName}";
/** DEFAULT as v0.0.3 wrote it, and as Toucan writes it now. */
const V003 = `\${activeRepositoryName}${DEFAULT}`;
const TODAY =
  "${toucanRepoLead}${dirty}${activeEditorShort}${separator}${toucanRepoEmoji}${rootName}${separator}${appName}";

describe("titleWithEmoji", () => {
  it("puts the lead variable in front and the emoji slot before the folder name", () => {
    expect(titleWithEmoji(DEFAULT)).toBe(TODAY);
  });

  it("adds only the lead variable to a title without a folder name", () => {
    expect(titleWithEmoji("${activeEditorShort}")).toBe("${toucanRepoLead}${activeEditorShort}");
  });

  it("puts its own variable in front of a title that uses SCM's repository name", () => {
    expect(titleWithEmoji("${activeRepositoryName} · ${rootName}")).toBe(
      "${toucanRepoLead}${activeRepositoryName} · ${toucanRepoEmoji}${rootName}",
    );
  });

  it("needs no change when the lead variable is already there", () => {
    expect(titleWithEmoji("${toucanRepoLead}${rootName}")).toBeUndefined();
  });
});

describe("currentForm", () => {
  it("moves v0.0.3's title to the lead variable and adds the slot", () => {
    expect(currentForm(V003)).toBe(TODAY);
  });

  it("moves a title that already had the slot to the lead variable", () => {
    expect(currentForm("${activeRepositoryName}${toucanRepoEmoji}${rootName}")).toBe(
      "${toucanRepoLead}${toucanRepoEmoji}${rootName}",
    );
  });

  it("leaves today's form alone", () => {
    expect(currentForm(TODAY)).toBe(TODAY);
  });
});

describe("writtenForms", () => {
  it("lists the recorded title, with the slot added, and in today's form, once each", () => {
    expect(writtenForms(V003)).toEqual([
      V003,
      "${activeRepositoryName}${dirty}${activeEditorShort}${separator}${toucanRepoEmoji}${rootName}${separator}${appName}",
      TODAY,
    ]);
    expect(writtenForms(TODAY)).toEqual([TODAY]);
  });
});

describe("titleToRestore", () => {
  it("restores the previous value while the title is still Toucan's", () => {
    expect(
      titleToRestore({ change: { previous: "${rootName}", written: TODAY }, current: TODAY }),
    ).toEqual({ restore: true, value: "${rootName}" });
  });

  it("restores an unset title as unset", () => {
    expect(
      titleToRestore({ change: { previous: undefined, written: TODAY }, current: TODAY }),
    ).toEqual({ restore: true, value: undefined });
  });

  it("restores a v0.0.3 record whose title was already upgraded", () => {
    expect(
      titleToRestore({ change: { previous: "${rootName}", written: V003 }, current: TODAY }),
    ).toEqual({ restore: true, value: "${rootName}" });
  });

  it("keeps the user's own edit, and an unset title", () => {
    const change = { previous: undefined, written: TODAY };
    expect(titleToRestore({ change, current: "${rootName} edited" })).toEqual({ restore: false });
    expect(titleToRestore({ change, current: undefined })).toEqual({ restore: false });
  });

  it("has nothing to restore when Toucan changed nothing", () => {
    expect(titleToRestore({ change: { previous: "x", written: undefined }, current: "x" })).toEqual(
      { restore: false },
    );
  });
});

describe("withEmojiSlot", () => {
  it("puts the slot in front of the first folder name only", () => {
    expect(withEmojiSlot("${toucanRepoLead}${rootName} (${rootName})")).toBe(
      "${toucanRepoLead}${toucanRepoEmoji}${rootName} (${rootName})",
    );
  });

  it("leaves a title that has the slot, or no folder name", () => {
    expect(withEmojiSlot("${toucanRepoEmoji}${rootName}")).toBe("${toucanRepoEmoji}${rootName}");
    expect(withEmojiSlot("${activeEditorShort}")).toBe("${activeEditorShort}");
  });
});

describe("titleValues", () => {
  const repo = { emoji: "🟦" };

  it("puts the emoji in front while an editor is open", () => {
    expect(titleValues({ repo, hasEditor: true, hasSlot: true })).toEqual({
      lead: "🟦 ",
      beforeRoot: "",
    });
  });

  it("moves the emoji to the folder name while no editor is open", () => {
    expect(titleValues({ repo, hasEditor: false, hasSlot: true })).toEqual({
      lead: "",
      beforeRoot: "🟦 ",
    });
  });

  it("keeps the emoji in front in a title without the slot", () => {
    expect(titleValues({ repo, hasEditor: false, hasSlot: false })).toEqual({
      lead: "🟦 ",
      beforeRoot: "",
    });
  });

  it("shows nothing for a repo without a color", () => {
    expect(titleValues({ repo: undefined, hasEditor: false, hasSlot: true })).toEqual({
      lead: "",
      beforeRoot: "",
    });
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
