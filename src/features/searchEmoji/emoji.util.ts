import { fromHex, toOklch } from "../../shared/color/color.util.ts";
import type { Glyph, Hex } from "../../shared/model/model.types.ts";

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

const CHROMATICS: readonly Chromatic[] = ["red", "orange", "yellow", "green", "blue", "purple"];

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
const BROWN_HUE_FROM = 35;
const BROWN_HUE_TO = 100;
/** Dark colors in this OKLCH hue band (orange to yellow) map to brown. */
export const BROWN_HUES = [BROWN_HUE_FROM, BROWN_HUE_TO] as const;
/** Lightness below which a color in the brown hue band is brown. */
export const BROWN_LIGHTNESS = 0.55;
/** Hue is an angle: distances wrap around at 360°. */
const FULL_CIRCLE_DEG = 360;

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
 * The emoji set for a glyph: circle and heart have their own; every other
 * glyph uses squares, since no emoji both matches its shape and comes in every
 * color (⭐ is only yellow, for example).
 */
function family(glyph: Glyph): Record<EmojiColor, string> {
  return glyph === "circle" ? CIRCLES : glyph === "heart" ? HEARTS : SQUARES;
}

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

interface EmojiForArgs {
  hex: Hex;
  glyph: Glyph;
}

/** The emoji for a repo's color in its glyph's shape (toucan-v1/0007, toucan-v1/0012). */
export function emojiFor({ hex, glyph }: EmojiForArgs): string {
  return family(glyph)[emojiColor(hex)];
}

function nearestHue(hue: number): Chromatic {
  let best: Chromatic = "red";
  let bestDistance = Infinity;
  for (const name of CHROMATICS) {
    const target = HUES[name];
    const distance = Math.min(Math.abs(hue - target), FULL_CIRCLE_DEG - Math.abs(hue - target));
    if (distance < bestDistance) {
      best = name;
      bestDistance = distance;
    }
  }
  return best;
}
