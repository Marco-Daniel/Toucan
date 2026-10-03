// import libraries
import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

// import utils
import { docsPage } from "../../app/lib/docs.content.ts";
import { docsPath } from "../../app/lib/docs.util.ts";
import { renderMarkdown } from "../../app/lib/markdown.util.ts";

// import consts
import { SCREENSHOT_URLS } from "../../app/lib/brand.assets.ts";
import { DOCS_PAGES } from "../../app/lib/docs.consts.ts";

const CONTENT = new URL("../../content/docs/", import.meta.url);

/** Each page's rendered HTML by its path; rendering also fails on an unknown image. */
const rendered = new Map(
  DOCS_PAGES.map(({ slug }) => {
    const found = docsPage(slug);
    return [
      docsPath(slug),
      found === undefined
        ? ""
        : renderMarkdown({ markdown: found.markdown, images: SCREENSHOT_URLS }),
    ];
  }),
);

describe("the docs content", () => {
  it("is one markdown file per page, no more and no fewer", () => {
    expect(readdirSync(CONTENT).toSorted()).toEqual(
      [
        "colors",
        "commands",
        "getting-started",
        "glyphs",
        "presets",
        "search-emoji",
        "settings",
        "sidebar",
      ].map((slug) => `${slug}.md`),
    );
    expect(DOCS_PAGES.filter(({ slug }) => docsPage(slug) === undefined)).toEqual([]);
  });

  it("finds no page for a slug it doesn't have", () => {
    expect(docsPage("nope")).toBeUndefined();
  });

  it("links only to docs pages and headings that exist", () => {
    const broken = [...rendered].flatMap(([from, html]) =>
      [...html.matchAll(/href="(\/docs[^"#]*)(?:#([^"]+))?"/g)].flatMap(([, path = "", anchor]) => {
        const target = rendered.get(path);
        const isMissing =
          target === undefined || (anchor !== undefined && !target.includes(`id="${anchor}"`));
        return isMissing ? [`${from} → ${path}${anchor === undefined ? "" : `#${anchor}`}`] : [];
      }),
    );
    expect(broken).toEqual([]);
    // It did check links: Commands links to five sections.
    expect([...(rendered.get("/docs/commands") ?? "").matchAll(/href="\/docs/g)]).toHaveLength(5);
  });

  it("shows each README screenshot it uses at the build's URL", () => {
    expect(rendered.get("/docs/sidebar")).toContain(
      `<img src="${SCREENSHOT_URLS["sidebar-muted.png"]}"`,
    );
  });
});
