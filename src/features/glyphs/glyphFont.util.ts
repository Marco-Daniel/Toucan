import type { Glyph, Hex } from "../../shared/model/model.types.ts";

// What `pnpm font` needs from the glyph code. Kept apart from glyphs.ts, which
// imports the generated paths that `pnpm font` rewrites, so a missing or broken
// generated file can't stop it from being regenerated.

/**
 * Private-use codepoints of the glyphs in Toucan's icon font. pill, square and
 * bar keep their original codepoints; the rest follow in group order.
 */
export const FONT_CODEPOINTS: Record<Glyph, number> = {
  pill: 0xe000,
  square: 0xe001,
  bar: 0xe002,
  circle: 0xe003,
  toucan: 0xe004,
  sun: 0xe005,
  leaf: 0xe006,
  drop: 0xe007,
  moon: 0xe008,
  alien: 0xe009,
  ghost: 0xe00a,
  robot: 0xe00b,
  cat: 0xe00c,
  bolt: 0xe00d,
  heart: 0xe00e,
  star: 0xe00f,
  rocket: 0xe010,
};

/** Every glyph is 16 units high. */
export const HEIGHT = 16;
/** Coordinates are kept to hundredths of a unit. */
const HUNDREDTHS = 100;

function round(value: number): number {
  return Math.round(value * HUNDREDTHS) / HUNDREDTHS;
}

/** The SVG for one baked glyph path; `pnpm font` uses it for the font sources too. */
export function shapeSvg(width: number, d: string, color: Hex, height = HEIGHT): string {
  const pixelWidth = round((width / HEIGHT) * height);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${pixelWidth}" height="${height}" ` +
    `viewBox="0 0 ${width} ${HEIGHT}" fill="${color}"><path d="${d}"/></svg>`
  );
}
