// import libraries
import { describe, expect, it } from "vitest";

// import utils
import { docsPath, isCurrentPath, isDocsSlug } from "../../app/lib/docs.util.ts";

describe("docsPath", () => {
  it("puts the first page at /docs and the others under it", () => {
    expect(docsPath("getting-started")).toBe("/docs");
    expect(docsPath("settings")).toBe("/docs/settings");
  });
});

describe("isCurrentPath", () => {
  it.each([
    ["/docs/settings", "/docs/settings", true],
    ["/docs/settings/", "/docs/settings", true],
    ["/docs/", "/docs", true],
    ["/docs/settings", "/docs", false],
    ["/docs/settings-old", "/docs/settings", false],
    ["/", "/", true],
  ])("%s is %s: %s", (pathname, path, expected) => {
    expect(isCurrentPath({ pathname, path })).toBe(expected);
  });
});

describe("isDocsSlug", () => {
  it.each([
    ["settings", true],
    ["commands", true],
    ["getting-started", false],
    ["nope", false],
    ["", false],
  ])("%j: %s", (slug, expected) => {
    expect(isDocsSlug(slug)).toBe(expected);
  });
});
