// The docs pages' markdown, bundled at build time.
// import consts
import { DOCS_PAGES } from "./docs.consts.ts";

// import types
import type { DocsPage } from "./docs.consts.ts";

const MARKDOWN = import.meta.glob<string>("../../content/docs/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});

/** The page with this slug and its markdown, or undefined when there's none. */
export function docsPage(slug: string): { page: DocsPage; markdown: string } | undefined {
  const page = DOCS_PAGES.find((candidate) => candidate.slug === slug);
  const markdown = MARKDOWN[`../../content/docs/${slug}.md`];
  return page === undefined || markdown === undefined ? undefined : { page, markdown };
}
