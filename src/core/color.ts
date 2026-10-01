import {
  converter,
  displayable,
  formatHex,
  formatHex8,
  modeA98,
  modeHsl,
  modeHsv,
  modeHwb,
  modeLab,
  modeLab65,
  modeLch,
  modeLch65,
  modeLrgb,
  modeOklab,
  modeOklch,
  modeP3,
  modeProphoto,
  modeRec2020,
  modeRgb,
  modeXyz50,
  modeXyz65,
  parse,
  toGamut,
  useMode,
  type Color,
} from "culori/fn";
import type { Hex } from "./model.ts";

// The color spaces CSS Color 4 can express, so `parse` accepts any CSS color
// string (the same set culori's `css` entry registers).
for (const mode of [
  modeRgb,
  modeLrgb,
  modeHsl,
  modeHsv,
  modeHwb,
  modeLab,
  modeLab65,
  modeLch,
  modeLch65,
  modeOklab,
  modeOklch,
  modeP3,
  modeA98,
  modeProphoto,
  modeRec2020,
  modeXyz50,
  modeXyz65,
]) {
  useMode(mode);
}

// Maps out-of-gamut colors into sRGB by reducing OKLCH chroma, which keeps
// the hue, where clamping each channel would shift it.
const toSrgbGamut = toGamut("rgb", "oklch");

/** Converts any parsed color to OKLCH. */
export const toOklch = converter("oklch");

/**
 * Parses a Hex. Never fails in practice: a Hex only comes from `toHex`, so a
 * failure means a bug, and it throws rather than guessing a color.
 */
export function fromHex(hex: Hex): Color {
  const color = parseColor(hex);
  if (!color) {
    throw new Error(`Not a color: ${hex}`);
  }
  return color;
}

export function parseColor(input: string): Color | undefined {
  return parse(input.trim());
}

/** Whether the alpha survives as something other than `ff` in hex. */
export function isTranslucent(color: Color): boolean {
  return color.alpha !== undefined && Math.round(color.alpha * 255) < 255;
}

/** The same color without its alpha channel. */
export function opaque(color: Color): Color {
  const { alpha: _alpha, ...rest } = color;
  return rest;
}

/** `#rrggbb`, or `#rrggbbaa` when the color is translucent. */
export function toHex(color: Color): Hex {
  // In-gamut colors skip the OKLCH round trip, which can introduce rounding errors.
  const srgb = displayable(color) ? color : toSrgbGamut(color);
  return (isTranslucent(srgb) ? formatHex8(srgb) : formatHex(srgb)) as Hex;
}

/** The background a preview starts from before the repo has a color. */
export const NEUTRAL_GRAY = toHex({ mode: "rgb", r: 0.5, g: 0.5, b: 0.5 });

/** Parses any CSS color string to hex, or `undefined` when it isn't a color. */
export function normalizeColor(input: string): Hex | undefined {
  const color = parseColor(input);
  return color && toHex(color);
}

/** What Set Color makes of the typed text: nothing yet, an error, or a background. */
export type ColorInput =
  | { kind: "empty" }
  | { kind: "invalid"; message: string }
  | { kind: "color"; hex: Hex };

export function validateColorInput(value: string): ColorInput {
  if (value.trim() === "") {
    return { kind: "empty" };
  }
  const color = parseColor(value);
  if (!color) {
    return { kind: "invalid", message: "Not a color." };
  }
  if (isTranslucent(color)) {
    return {
      kind: "invalid",
      message: "Use an opaque color; the background can't be translucent.",
    };
  }
  return { kind: "color", hex: toHex(color) };
}
