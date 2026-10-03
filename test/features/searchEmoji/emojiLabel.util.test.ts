// import libraries
import { describe, expect, it } from "vitest";

// import utils
import { EmojiLabel } from "../../../src/features/searchEmoji/emojiLabel.util.ts";

const REPO = { emoji: "🟧" };

/** A fake window: every registration and context write in order; registration can fail. */
function create({ registerFails = false } = {}) {
  const world = { calls: [] as string[], warnings: [] as string[] };
  const label = new EmojiLabel({
    register: async (name, contextKey) => {
      world.calls.push(`register ${name}=${contextKey}`);
      if (registerFails) {
        throw new Error("command 'registerWindowTitleVariable' not found");
      }
    },
    setContext: async (key, value) => {
      world.calls.push(`${key}=${value}`);
    },
    warn: (message) => world.warnings.push(message),
  });
  return { label, world };
}

describe("EmojiLabel", () => {
  it("registers both variables once, then moves the emoji as editors open and close", async () => {
    const { label, world } = create();
    await label.apply({ repo: REPO, hasEditor: false, hasSlot: true });
    await label.apply({ repo: REPO, hasEditor: true, hasSlot: true });
    expect(world.calls).toEqual([
      "register toucanRepoLead=toucan.repoLead",
      "register toucanRepoEmoji=toucan.repoEmoji",
      "toucan.repoLead=",
      "toucan.repoEmoji=🟧 ",
      "toucan.repoLead=🟧 ",
      "toucan.repoEmoji=",
    ]);
    expect(world.warnings).toEqual([]);
  });

  it("shows no emoji when registration fails, says so once and doesn't retry", async () => {
    const { label, world } = create({ registerFails: true });
    await label.apply({ repo: REPO, hasEditor: true, hasSlot: true });
    await label.apply({ repo: REPO, hasEditor: false, hasSlot: true });
    await label.clear();
    expect(world.calls).toEqual(["register toucanRepoLead=toucan.repoLead"]);
    expect(world.warnings).toEqual([
      "Couldn't register the search emoji's title variables, so it doesn't show: Error: command 'registerWindowTitleVariable' not found",
    ]);
  });

  it("empties both variables on clear, once they're registered", async () => {
    const { label, world } = create();
    await label.clear();
    expect(world.calls).toEqual([]);
    await label.apply({ repo: REPO, hasEditor: true, hasSlot: false });
    await label.clear();
    expect(world.calls.slice(-2)).toEqual(["toucan.repoLead=", "toucan.repoEmoji="]);
  });
});
