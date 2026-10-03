// import libraries
import { describe, expect, it } from "vitest";

// import utils
import { pageMeta } from "../../app/lib/meta.util.ts";

describe("pageMeta", () => {
  it("gives a page its title, description, canonical URL and social card", () => {
    expect(
      pageMeta({ title: "Settings", description: "Every setting.", path: "/docs/settings" }),
    ).toEqual([
      { title: "Settings · Toucan" },
      { name: "description", content: "Every setting." },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Toucan" },
      { property: "og:title", content: "Settings · Toucan" },
      { property: "og:description", content: "Every setting." },
      { property: "og:url", content: "https://toucan-vscode.netlify.app/docs/settings" },
      { property: "og:image", content: "https://toucan-vscode.netlify.app/og-image.png" },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "og:image:alt", content: "Toucan: every repo gets its own color." },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: "https://toucan-vscode.netlify.app/og-image.png" },
      {
        tagName: "link",
        rel: "canonical",
        href: "https://toucan-vscode.netlify.app/docs/settings",
      },
    ]);
  });

  it("titles the home page just Toucan", () => {
    expect(pageMeta({ title: "Toucan", description: "d", path: "/" })[0]).toEqual({
      title: "Toucan",
    });
  });
});
