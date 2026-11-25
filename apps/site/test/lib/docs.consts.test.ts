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

  it("describes every page in one distinct sentence a search result shows in full", () => {
    const descriptions = DOCS_PAGES.map(({ description }) => description);
    expect(
      descriptions.filter(
        (description) =>
          !/^[A-Z0-9`].*[^.]\.$/.test(description) ||
          description.length > MAX_DESCRIPTION_LENGTH ||
          description.includes(". "),
      ),
    ).toEqual([]);
    expect(new Set(descriptions).size).toBe(DOCS_PAGES.length);
  });
});
