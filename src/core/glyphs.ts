import { GLYPH_PATHS } from "../generated/glyphPaths.ts";
import { GLYPH_GROUPS, type Glyph, type Hex } from "./model.ts";

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

/**
 * Solid codicon used where no glyph applies (0005). VS Code gives extensions
 * no signal when a contributed icon font fails to load, so don't try to
 * detect that and swap this in.
 */
export const FALLBACK_ICON = "circle-large-filled";

const HEIGHT = 16;

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Escapes `$(…)` in user text such as a folder name, so VS Code shows it
 * literally instead of as an icon. Its label renderer prints `\$(x)` as `$(x)`.
 */
export function escapeIcons(text: string): string {
  return text.replaceAll("$(", "\\$(");
}

/** The icon id Toucan contributes for a glyph (package.json `icons`). */
export function glyphIconId(glyph: Glyph): string {
  return `toucan-${glyph}`;
}

/** `$(…)` text for a status bar item or markdown string. */
export function glyphIcon(glyph: Glyph): string {
  return `$(${glyphIconId(glyph)})`;
}

/**
 * Standalone SVG of the glyph in `color`, `height` pixels high, keeping the
 * glyph's aspect ratio. Used for tooltip swatches and the sidebar block.
 */
export function glyphSvg(glyph: Glyph, color: Hex, height = HEIGHT): string {
  const { width, d } = GLYPH_PATHS[glyph];
  return shapeSvg(width, d, color, height);
}

/** The SVG for one baked glyph path; `pnpm font` uses it for the font sources too. */
export function shapeSvg(width: number, d: string, color: Hex, height = HEIGHT): string {
  const pixelWidth = round((width / HEIGHT) * height);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${pixelWidth}" height="${height}" ` +
    `viewBox="0 0 ${width} ${HEIGHT}" fill="${color}"><path d="${d}"/></svg>`
  );
}

/** `data:` URI for an SVG, as accepted by markdown tooltips (0005). */
export function svgDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

/** Set Glyph's list: a separator per group, then its glyphs, the current one marked. */
export type GlyphPickEntry =
  | { kind: "separator"; label: string }
  | { kind: "glyph"; glyph: Glyph; current: boolean };

export function glyphPickEntries(current: Glyph): GlyphPickEntry[] {
  const entries: GlyphPickEntry[] = [];
  for (const { label, glyphs } of GLYPH_GROUPS) {
    entries.push({ kind: "separator", label });
    for (const glyph of glyphs) {
      entries.push({ kind: "glyph", glyph, current: glyph === current });
    }
  }
  return entries;
}
