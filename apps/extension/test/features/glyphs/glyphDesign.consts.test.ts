// import libraries
import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";

// import consts
import { GLYPHS } from "@toucan/brand/glyphs.consts.ts";
import { GLYPH_DESIGNS } from "../../../src/features/glyphs/glyphDesign.consts.ts";

/** The glyph set, written out once: the brand names it, the extension designs it, `font` draws it. */
const GLYPH_SET = [
  "alien",
  "bar",
  "bolt",
  "cat",
  "circle",
  "drop",
  "ghost",
  "heart",
  "leaf",
  "moon",
  "pill",
  "robot",
  "rocket",
  "square",
  "star",
  "sun",
  "toucan",
];

const SVG_DIR = new URL("../../../../../packages/brand/assets/glyphs/", import.meta.url);

describe("the glyph set across the brand and the extension", () => {
  it("is the brand's glyph names, no more and no fewer", () => {
    expect([...GLYPHS].toSorted()).toEqual(GLYPH_SET);
  });

  it("has a design for every glyph and for nothing else", () => {
    expect(Object.keys(GLYPH_DESIGNS).toSorted()).toEqual(GLYPH_SET);
  });

  it("has a brand SVG for every glyph and for nothing else", () => {
    const svgs = readdirSync(SVG_DIR).filter((file) => file !== "README.md");
    expect(svgs.toSorted()).toEqual(GLYPH_SET.map((glyph) => `${glyph}.svg`));
  });
});
