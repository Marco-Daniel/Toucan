// import types
import type { Glyph } from "./glyphs.types.ts";

/** Curated status bar glyphs, in group order (glyph-set/0002 and glyph-set/0007). */
export const GLYPHS = [
  "square",
  "bar",
  "pill",
  "circle",
  "toucan",
  "sun",
  "leaf",
  "drop",
  "moon",
  "alien",
  "ghost",
  "robot",
  "cat",
  "bolt",
  "heart",
  "star",
  "rocket",
] as const;

/** The themed groups Set Glyph and the site show, together covering GLYPHS in order (glyph-set/0002, glyph-set/0007). */
export const GLYPH_GROUPS: readonly { label: string; glyphs: readonly Glyph[] }[] = [
  { label: "Shapes", glyphs: ["square", "bar", "pill", "circle"] },
  { label: "Toucan's world", glyphs: ["toucan", "sun", "leaf", "drop", "moon"] },
  { label: "Characters", glyphs: ["alien", "ghost", "robot", "cat"] },
  { label: "Fun & dev", glyphs: ["bolt", "heart", "star", "rocket"] },
];
