// import libraries
import { describe, expect, it } from "vitest";

// import consts
import { GLYPH_GROUPS, GLYPHS } from "../src/glyphs.consts.ts";

describe("glyph groups", () => {
  it("are the four themed groups, covering GLYPHS in order", () => {
    expect(GLYPH_GROUPS.map(({ label, glyphs }) => `${label}: ${glyphs.join(" ")}`)).toEqual([
      "Shapes: square bar pill circle",
      "Toucan's world: toucan sun leaf drop moon",
      "Characters: alien ghost robot cat",
      "Fun & dev: bolt heart star rocket",
    ]);
    expect(GLYPH_GROUPS.flatMap(({ glyphs }) => glyphs)).toEqual([...GLYPHS]);
  });
});
