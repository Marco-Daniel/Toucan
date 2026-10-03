// import libraries
import { describe, expect, it } from "vitest";

// import utils
import { escapeHtml, headingId, renderMarkdown } from "../../app/lib/markdown.util.ts";

describe("headingId", () => {
  it.each([
    ["toucan.repos", "toucanrepos"],
    ["Search emoji (experimental)", "search-emoji-experimental"],
    ["Set <code>Color</code>", "set-color"],
    ["Toucan's world", "toucans-world"],
  ])("gives %j the GitHub id %j", (text, id) => {
    expect(headingId(text)).toBe(id);
  });
});

describe("escapeHtml", () => {
  it("escapes the five special characters", () => {
    expect(escapeHtml(`<a href="x">Tom & Jerry's</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;",
    );
  });
});

describe("renderMarkdown", () => {
  it("renders headings with ids, lists and code", () => {
    expect(renderMarkdown({ markdown: "## Set Color\n\n- one `two`\n" })).toBe(
      '<h2 id="set-color">Set Color</h2>\n<ul>\n<li>one <code>two</code></li>\n</ul>\n',
    );
  });

  it("shows raw HTML as text, so no markup or script gets onto the page", () => {
    expect(renderMarkdown({ markdown: "<script>alert(1)</script>\n" })).toBe(
      "&lt;script&gt;alert(1)&lt;/script&gt;\n",
    );
    expect(renderMarkdown({ markdown: 'a <img src=x onerror="y"> b' })).toBe(
      "<p>a &lt;img src=x onerror=&quot;y&quot;&gt; b</p>\n",
    );
  });

  it("keeps http(s), mailto and site links and drops any other scheme to its text", () => {
    expect(
      renderMarkdown({
        markdown:
          "[a](https://x.dev) [f](http://x.dev) [b](/docs) [c](#top) [d](mailto:a@b.c) [e](javascript:alert(1)) [g](data:text/html,x)",
      }),
    ).toBe(
      '<p><a href="https://x.dev">a</a> <a href="http://x.dev">f</a> <a href="/docs">b</a> <a href="#top">c</a> <a href="mailto:a@b.c">d</a> e g</p>\n',
    );
  });

  it("points images at the build's URLs and fails on an image it doesn't know", () => {
    expect(
      renderMarkdown({
        markdown: "![A shot](hero.gif)",
        images: { "hero.gif": "/assets/hero-1a.gif" },
      }),
    ).toBe('<p><img src="/assets/hero-1a.gif" alt="A shot" loading="lazy"></p>\n');
    expect(() => renderMarkdown({ markdown: "![x](gone.png)" })).toThrow(
      "Unknown image in markdown: gone.png",
    );
  });

  it("renders GitHub-flavored tables, as the commands page uses", () => {
    expect(renderMarkdown({ markdown: "| A | B |\n| --- | --- |\n| 1 | 2 |\n" })).toBe(
      "<table>\n<thead>\n<tr>\n<th>A</th>\n<th>B</th>\n</tr>\n</thead>\n<tbody><tr>\n<td>1</td>\n<td>2</td>\n</tr>\n</tbody></table>\n",
    );
  });

  it("prefixes heading ids and moves headings down, for release notes under the page's own", () => {
    expect(
      renderMarkdown({ markdown: "## Install\n###### Deep", idPrefix: "v0.0.4-", headingShift: 1 }),
    ).toBe('<h3 id="v0.0.4-install">Install</h3>\n<h6 id="v0.0.4-deep">Deep</h6>\n');
  });
});
