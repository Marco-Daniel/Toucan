// Markdown to HTML for the docs pages and the changelog, at build time. Raw
// HTML in the source is shown as text, links only go to http(s), mailto or
// within the site, and images must be README screenshots the build knows, so
// neither the docs nor a release note can put markup or scripts on a page.
// import libraries
import { Marked } from "marked";

// import types
import type { Tokens } from "marked";

const SAFE_HREF = /^(?:https?:|mailto:|\/|#)/i;

/** The id GitHub gives a heading: lower case, punctuation dropped, spaces as dashes. */
export function headingId(text: string): string {
  return text
    .toLowerCase()
    .replaceAll(/<[^>]*>/g, "")
    .replaceAll(/[^\p{L}\p{N}\s_-]/gu, "")
    .trim()
    .replaceAll(/\s/g, "-");
}

/** Text as HTML text: the five characters HTML treats specially, escaped. */
export function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

interface RenderMarkdownArgs {
  markdown: string;
  /** The URL of each image the markdown may show, by file name. */
  images?: Readonly<Record<string, string>>;
  /** Put before every heading id, for several documents on one page. */
  idPrefix?: string;
  /** Levels every heading moves down, for a document under a page's own headings. */
  headingShift?: number;
}

/** HTML's deepest heading. */
const DEEPEST_HEADING = 6;

/** The markdown as HTML. Throws on an image it doesn't know, so a broken image fails the build. */
export function renderMarkdown({
  markdown,
  images = {},
  idPrefix = "",
  headingShift = 0,
}: RenderMarkdownArgs): string {
  const marked = new Marked({
    gfm: true,
    renderer: {
      html({ text }: Tokens.HTML | Tokens.Tag): string {
        return escapeHtml(text);
      },
      heading({ tokens, depth }: Tokens.Heading): string {
        const inner = this.parser.parseInline(tokens);
        const level = Math.min(depth + headingShift, DEEPEST_HEADING);
        return `<h${level} id="${idPrefix}${headingId(inner)}">${inner}</h${level}>\n`;
      },
      link({ href, tokens }: Tokens.Link): string {
        const inner = this.parser.parseInline(tokens);
        return SAFE_HREF.test(href) ? `<a href="${escapeHtml(href)}">${inner}</a>` : inner;
      },
      image({ href, text }: Tokens.Image): string {
        const url = images[href];
        if (url === undefined) {
          throw new Error(`Unknown image in markdown: ${href}`);
        }
        return `<img src="${escapeHtml(url)}" alt="${escapeHtml(text)}" loading="lazy">`;
      },
    },
  });
  return marked.parse(markdown, { async: false });
}
