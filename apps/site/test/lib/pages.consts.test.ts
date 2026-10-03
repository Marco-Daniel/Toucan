// import libraries
import { describe, expect, it } from "vitest";

// import consts
import { PAGE_PATHS } from "../../app/lib/pages.consts.ts";

describe("PAGE_PATHS", () => {
  it("are home, the changelog and every docs page, getting started at /docs", () => {
    expect(PAGE_PATHS).toEqual([
      "/",
      "/changelog",
      "/docs",
      "/docs/colors",
      "/docs/presets",
      "/docs/glyphs",
      "/docs/sidebar",
      "/docs/search-emoji",
      "/docs/settings",
      "/docs/commands",
    ]);
  });
});
