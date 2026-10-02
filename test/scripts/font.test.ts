import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Resvg } from "@resvg/resvg-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { FONT_CODEPOINTS } from "../../src/core/glyphFont.ts";
import { glyphSvg } from "../../src/core/glyphs.ts";
import { GLYPH_PATHS } from "../../src/generated/glyphPaths.ts";
import { GLYPHS } from "../../src/core/model.ts";
import type { Glyph, Hex } from "../../src/core/model.ts";
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
  ({ svgFont } = font);
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
  // `pixels` copies the whole buffer on every access: read it once.
  const { pixels, width, height } = image;
  const mask = Array.from({ length: width * height }, (_, i) => pixels[i * 4 + 3]! > 127);
  return { width, mask };
}

/** Glyph units of empty margin around both drawings, so nothing is clipped and an overflow shows. */
const PAD = 2;

/**
 * The glyph as swatches draw it (glyphSvg, clipped to its own box), PAD units
 * in from the top left. Anything outside the box is cut off here but not in
 * the font, so it shows up as a difference.
 */
function swatchGlyph(glyph: Glyph): string {
  const { width } = GLYPH_PATHS[glyph];
  const swatch = glyphSvg(glyph, BLACK, 16 * SCALE).replace(
    '<svg xmlns="http://www.w3.org/2000/svg" ',
    `<svg x="${PAD * SCALE}" y="${PAD * SCALE}" `,
  );
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${(width + 2 * PAD) * SCALE}" height="${(16 + 2 * PAD) * SCALE}">` +
    `${swatch}</svg>`
  );
}

/** The glyph as the font draws it, placed like the swatch: 1/8 of the em below the baseline. */
function fontGlyph(glyph: Glyph): string {
  const { width } = GLYPH_PATHS[glyph];
  const size = 16 * SCALE;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${(width + 2 * PAD) * SCALE}" height="${size + 2 * PAD * SCALE}">` +
    `<text x="${PAD * SCALE}" y="${PAD * SCALE + size * 0.875}" font-family="toucan-icons" font-size="${size}" fill="${BLACK}">` +
    `&#x${FONT_CODEPOINTS[glyph].toString(16)};</text></svg>`
  );
}

describe("the icon font", () => {
  it.each(GLYPHS)("draws %s like its SVG, holes included", (glyph) => {
    const expected = ink(swatchGlyph(glyph));
    const actual = ink(fontGlyph(glyph), [fontFile]);
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
