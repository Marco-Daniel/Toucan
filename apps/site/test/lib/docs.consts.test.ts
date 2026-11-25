// The docs pages' titles head the sidebar and each page, and their descriptions
// become the page's meta and social-card description (docsPage.tsx, pageMeta).
// import libraries
import { describe, expect, it } from "vitest";

// import consts
import { DOCS_PAGES } from "../../app/lib/docs.consts.ts";

/** The longest description search engines show in full. */
const MAX_DESCRIPTION_LENGTH = 160;

describe("DOCS_PAGES", () => {
  it("titles the sidebar's pages in this order", () => {
    expect(DOCS_PAGES.map(({ slug, title }) => [slug, title])).toEqual([
      ["getting-started", "Getting started"],
      ["colors", "Colors"],
      ["presets", "Presets"],
      ["glyphs", "Glyphs"],
      ["sidebar", "Sidebar block"],
      ["search-emoji", "Search emoji"],
      ["settings", "Settings"],
      ["commands", "Commands"],
    ]);
  });

  it("gives each page its own description", () => {
    expect(DOCS_PAGES.map(({ slug, description }) => [slug, description])).toEqual([
      ["getting-started", "Install Toucan and give your first repository a color."],
      [
        "colors",
        "How Toucan colors the Command Center and the status bar, and how to set and clear a color.",
      ],
      ["presets", "The 16 toucan-themed preset colors and the low-contrast warning."],
      ["glyphs", "The 17 status bar glyphs in four groups, and how to pick one."],
      [
        "sidebar",
        "The opt-in color block in the Explorer: full or muted, shown until you hide it.",
      ],
      ["search-emoji", "The experimental colored emoji in the Command Center label."],
      ["settings", "Every Toucan setting, with the shape of toucan.repos."],
      ["commands", "Toucan's five commands and where to find them."],
    ]);
  });

  it("keeps every description to one sentence a search result shows in full", () => {
    expect(
      DOCS_PAGES.map(({ description }) => description).filter(
        (description) =>
          !/^[A-Z0-9`].*[^.]\.$/.test(description) ||
          description.length > MAX_DESCRIPTION_LENGTH ||
          description.includes(". "),
      ),
    ).toEqual([]);
  });
});
