// import libraries
import { describe, expect, it } from "vitest";

// import utils
import {
  headersForAll,
  inlineSources,
  sha256Source,
  sitePolicy,
  withPolicy,
} from "../../scripts/csp.mts";

const LOG = "console.log(1)";
const LOG_HASH = "'sha256-CihokcEcBW4atb/CW/XWsvWwbTjqwQlE9nj9ii5ww5M='";
const STYLE = ".a{}";
const STYLE_HASH = "'sha256-zykMelvY9taAHFfnWfsi7Rnifucb0B5GzFq+5ZuppCM='";

describe("inlineSources", () => {
  it("collects inline scripts (not ones with src), style blocks, and counts style attributes", () => {
    expect(
      inlineSources(
        `<head><script>${LOG}</script><script type="module" async="">import "/a.js";</script>` +
          `<script src="/b.js"></script><style>${STYLE}</style><style data-x="1">.b {\n}</style></head>` +
          `<body><div style="color:red"><span STYLE="x">y</span></div><p>style="not an attribute"</p></body>`,
      ),
    ).toEqual({
      scripts: [LOG, 'import "/a.js";'],
      styles: [STYLE, ".b {\n}"],
      styleAttributes: 2,
    });
  });

  it("finds nothing in a page without inline code", () => {
    expect(inlineSources('<html><script src="/a.js"></script></html>')).toEqual({
      scripts: [],
      styles: [],
      styleAttributes: 0,
    });
  });
});

describe("sha256Source", () => {
  it("is the text's SHA-256 in base64, as a CSP source", () => {
    expect(sha256Source(LOG)).toBe(LOG_HASH);
  });
});

describe("sitePolicy", () => {
  it("allows the site's own files and exactly the inline code's hashes, each once, and no framing", () => {
    expect(sitePolicy({ scripts: [LOG, LOG], styles: [STYLE] })).toBe(
      [
        "default-src 'self'",
        `script-src 'self' ${LOG_HASH}`,
        `style-src 'self' ${STYLE_HASH}`,
        "img-src 'self'",
        "font-src 'self'",
        "connect-src 'self'",
        "manifest-src 'self'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "object-src 'none'",
        "form-action 'self'",
      ].join("; "),
    );
  });

  it("lists several hashes sorted and space-separated, whatever the pages' order", () => {
    expect(sitePolicy({ scripts: [STYLE, LOG], styles: [] })).toContain(
      `script-src 'self' ${LOG_HASH} ${STYLE_HASH}; style-src 'self';`,
    );
  });

  it("allows no inline code at all when there is none", () => {
    expect(sitePolicy({ scripts: [], styles: [] })).toContain(
      "script-src 'self'; style-src 'self';",
    );
  });
});

describe("withPolicy", () => {
  const HEADERS =
    "# Sets  Content-Security-Policy: below\n/*\n  X-Frame-Options: DENY\n  Content-Security-Policy: frame-ancestors 'none'\n";

  it("replaces the policy line and leaves every other line alone", () => {
    expect(withPolicy({ headers: HEADERS, policy: "default-src 'self'" })).toBe(
      "# Sets  Content-Security-Policy: below\n/*\n  X-Frame-Options: DENY\n  Content-Security-Policy: default-src 'self'\n",
    );
  });

  it("throws when the file has no policy line to replace", () => {
    expect(() => withPolicy({ headers: "/*\n  X-Frame-Options: DENY\n", policy: "x" })).toThrow(
      "_headers has no Content-Security-Policy line to replace",
    );
  });
});

describe("headersForAll", () => {
  it("reads the /* rule's headers, and nothing from comments or other rules", () => {
    expect(
      headersForAll(
        "# X-Comment: no\n/*\n  X-Frame-Options: DENY\n  Content-Security-Policy: default-src 'self'; img-src 'self' data:\n/docs/*\n  X-Other: no\n",
      ),
    ).toEqual({
      "X-Frame-Options": "DENY",
      "Content-Security-Policy": "default-src 'self'; img-src 'self' data:",
    });
  });

  it("reads a header without a space after its colon, and a last line without a newline", () => {
    expect(headersForAll("/*\n  X-Tight:tight\n  X-Last: last")).toEqual({
      "X-Tight": "tight",
      "X-Last": "last",
    });
  });

  it("finds nothing without a /* rule", () => {
    expect(headersForAll("/docs/*\n  X-Other: no\n")).toEqual({});
  });
});
