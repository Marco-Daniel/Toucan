import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { FONT_CODEPOINTS, glyphSvg } from "../../src/core/glyphs.ts";
import { GLYPHS, type Glyph, type Hex } from "../../src/core/model.ts";
import { buildFont } from "../../scripts/font.mts";

const BLACK = "#000000" as Hex;
/** Pixels per glyph unit: a glyph is 16 units, so 160 px high. */
const SCALE = 10;

let dir: string;
let fontFile: string;
let svgFont: string;

// The font as `pnpm font` builds it, from the committed SVG sources.
beforeAll(async () => {
  const icons = GLYPHS.map((glyph) => ({
    name: glyph,
    codepoint: FONT_CODEPOINTS[glyph],
    svg: readFileSync(new URL(`../../media/icons/${glyph}.svg`, import.meta.url), "utf8"),
  }));
  const font = await buildFont(icons);
  svgFont = font.svgFont;
  dir = mkdtempSync(join(tmpdir(), "toucan-font-"));
  fontFile = join(dir, "toucan-icons.ttf");
  writeFileSync(fontFile, font.ttf);
});
afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

/** Opaque-pixel mask of an SVG rendered at its own size. */
function ink(svg: string, fontFiles: string[] = []): { width: number; mask: boolean[] } {
  const image = new Resvg(svg, { font: { fontFiles, loadSystemFonts: false } }).render();
  const mask = Array.from(
    { length: image.width * image.height },
    (_, i) => image.pixels[i * 4 + 3]! > 127,
  );
  return { width: image.width, mask };
}

/** The glyph as the font draws it, placed like the 16-unit SVG: 1/8 of the em below the baseline. */
function fontGlyph(glyph: Glyph, width: number): string {
  const size = 16 * SCALE;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width * SCALE}" height="${size}">` +
    `<text x="0" y="${size * 0.875}" font-family="toucan-icons" font-size="${size}" fill="${BLACK}">` +
    `&#x${FONT_CODEPOINTS[glyph].toString(16)};</text></svg>`
  );
}

describe("the icon font", () => {
  it.each(GLYPHS)("draws %s like its SVG, holes included", (glyph) => {
    const svg = glyphSvg(glyph, BLACK, 16 * SCALE);
    const width = Number(/viewBox="0 0 ([\d.]+) 16"/.exec(svg)?.[1]);
    const expected = ink(svg);
    const actual = ink(fontGlyph(glyph, width), [fontFile]);
    let both = 0;
    let either = 0;
    for (let i = 0; i < expected.mask.length; i++) {
      both += Number(expected.mask[i] && actual.mask[i]);
      either += Number(expected.mask[i] || actual.mask[i]);
    }
    // Rounding to 1/1000 em and anti-aliasing leave a sliver along the edges
    // (at least 0.996 today); a filled-in eye would cost the toucan about 2%.
    expect(both / either).toBeGreaterThan(0.99);
  });

  it("gives every glyph the advance width of its SVG", () => {
    const advances = Object.fromEntries(
      [...svgFont.matchAll(/<glyph glyph-name="([a-z]+)"[^>]*horiz-adv-x="(\d+)"/g)].map(
        ([, name, advance]) => [name, Number(advance) / (1000 / 16)],
      ),
    );
    expect(advances).toEqual({
      ...Object.fromEntries(GLYPHS.map((glyph) => [glyph, 16])),
      toucan: 18,
      bar: 6,
      pill: 44,
    });
  });
});
