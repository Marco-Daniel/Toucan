// import libraries
import { describe, expect, it } from "vitest";

// import utils
import { EmojiLabel } from "../../../src/features/searchEmoji/emojiLabel.util.ts";

/** Toucan wrote the title, with the emoji slot. */
const TOUCANS = {
  previous: undefined,
  written: "${activeRepositoryName}${activeEditorShort}${separator}${toucanRepoEmoji}${rootName}",
};
const REPO = { name: "webshop", emoji: "🟧" };

/** A fake window: every context write in order, and a registration that can fail. */
function create({ registerFails = false } = {}) {
  const world = { registrations: 0, contexts: [] as string[], warnings: [] as string[] };
  const label = new EmojiLabel({
    register: async () => {
      world.registrations += 1;
      if (registerFails) {
        throw new Error("command 'registerWindowTitleVariable' not found");
      }
    },
    setContext: async (key, value) => {
      world.contexts.push(`${key}=${value}`);
    },
    warn: (message) => world.warnings.push(message),
  });
  return { label, world };
}

describe("EmojiLabel", () => {
  it("registers the slot once and puts the emoji there while no editor is open", async () => {
    const { label, world } = create();
    expect(await label.apply({ change: TOUCANS, repo: REPO, hasEditor: false })).toBe(true);
    expect(await label.apply({ change: TOUCANS, repo: REPO, hasEditor: true })).toBe(true);
    expect(world.registrations).toBe(1);
    expect(world.contexts).toEqual([
      "scmActiveRepositoryName=",
      "toucan.repoEmoji=🟧 ",
      "scmActiveRepositoryName=🟧 ",
      "toucan.repoEmoji=",
    ]);
    expect(world.warnings).toEqual([]);
  });

  it("keeps the emoji in front when the slot can't be registered, and says so once", async () => {
    const { label, world } = create({ registerFails: true });
    expect(await label.apply({ change: TOUCANS, repo: REPO, hasEditor: false })).toBe(true);
    expect(await label.apply({ change: TOUCANS, repo: REPO, hasEditor: false })).toBe(true);
    expect(world.registrations).toBe(1);
    expect(world.contexts).toEqual(["scmActiveRepositoryName=🟧 ", "scmActiveRepositoryName=🟧 "]);
    expect(world.warnings).toEqual([
      "Couldn't register the search emoji's title variable, so the emoji stays in front: Error: command 'registerWindowTitleVariable' not found",
    ]);
  });

  it("hands back without registering when the user's own title has no color to show", async () => {
    const { label, world } = create();
    const own = { previous: "${activeRepositoryName}", written: undefined };
    expect(await label.apply({ change: own, repo: undefined, hasEditor: false })).toBe(false);
    expect(world).toEqual({ registrations: 0, contexts: [], warnings: [] });
  });
});
