import { fromHex, toOklch } from "./color.ts";
import type { Glyph, Hex } from "./model.ts";

/** The color categories emoji come in. */
export const EMOJI_COLORS = [
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "brown",
  "black",
  "white",
] as const;
export type EmojiColor = (typeof EMOJI_COLORS)[number];

type Chromatic = Exclude<EmojiColor, "brown" | "black" | "white">;

/**
 * OKLCH hue of each chromatic emoji, measured from Apple Color Emoji's
 * 🟥🟧🟨🟩🟦🟪 (the set VS Code shows on macOS). Other emoji fonts differ a little,
 * so borderline hues such as teal (~203) may read differently there.
 */
const HUES: Record<Chromatic, number> = {
  red: 30,
  orange: 61,
  yellow: 90,
  green: 143,
  blue: 261,
  purple: 311,
};

/** Below this OKLCH chroma a color reads as gray. */
export const ACHROMATIC_CHROMA = 0.045;
/** Gray at or above this OKLCH lightness maps to white, below to black. */
export const WHITE_LIGHTNESS = 0.6;
/** Dark colors in this OKLCH hue band (orange to yellow) map to brown. */
export const BROWN_HUES = [35, 100] as const;
/** Lightness below which a color in the brown hue band is brown. */
export const BROWN_LIGHTNESS = 0.55;

const SQUARES: Record<EmojiColor, string> = {
  red: "🟥",
  orange: "🟧",
  yellow: "🟨",
  green: "🟩",
  blue: "🟦",
  purple: "🟪",
  brown: "🟫",
  black: "⬛",
  white: "⬜",
};

const CIRCLES: Record<EmojiColor, string> = {
  red: "🔴",
  orange: "🟠",
  yellow: "🟡",
  green: "🟢",
  blue: "🔵",
  purple: "🟣",
  brown: "🟤",
  black: "⚫",
  white: "⚪",
};

const HEARTS: Record<EmojiColor, string> = {
  red: "❤️",
  orange: "🧡",
  yellow: "💛",
  green: "💚",
  blue: "💙",
  purple: "💜",
  brown: "🤎",
  black: "🖤",
  white: "🤍",
};

/**
 * Emoji set per glyph shape; shapes without their own emoji use squares. Star
 * uses squares too, because ⭐ only comes in yellow and would lose the color (0012).
 */
const FAMILIES: Record<Glyph, (color: EmojiColor) => string> = {
  square: (color) => SQUARES[color],
  bar: (color) => SQUARES[color],
  pill: (color) => SQUARES[color],
  circle: (color) => CIRCLES[color],
  "double-circle": (color) => CIRCLES[color],
  "check-circle": (color) => CIRCLES[color],
  heart: (color) => HEARTS[color],
  star: (color) => SQUARES[color],
};

/** The emoji color category a color reads as. */
export function emojiColor(hex: Hex): EmojiColor {
  const { l, c, h } = toOklch(fromHex(hex));
  if (c < ACHROMATIC_CHROMA || h === undefined) {
    return l >= WHITE_LIGHTNESS ? "white" : "black";
  }
  if (l < BROWN_LIGHTNESS && h >= BROWN_HUES[0] && h < BROWN_HUES[1]) {
    return "brown";
  }
  return nearestHue(h);
}

/** The emoji for a repo's color in its glyph's shape (0007, 0012). */
export function emojiFor(hex: Hex, glyph: Glyph): string {
  return FAMILIES[glyph](emojiColor(hex));
}

function nearestHue(hue: number): Chromatic {
  let best: Chromatic = "red";
  let bestDistance = Infinity;
  for (const [name, target] of Object.entries(HUES) as [Chromatic, number][]) {
    const distance = Math.min(Math.abs(hue - target), 360 - Math.abs(hue - target));
    if (distance < bestDistance) {
      best = name;
      bestDistance = distance;
    }
  }
  return best;
}
