// import libraries
import { wcagContrast } from "culori/fn";

// import utils
import { fromHex, toHex, toOklch } from "./color.util.ts";

// import types
import type { Color } from "culori/fn";
import type { ColorOverrides, CommandCenterColors, Hex } from "../model/model.types.ts";

// Starting amounts from toucan-v1/0004, to be tuned in the real title bar.
/** OKLCH lightness shift from background to hover background. */
export const ACTIVE_BACKGROUND_SHIFT = 0.06;
/** OKLCH lightness shift from background to border. */
export const BORDER_SHIFT = 0.12;
/**
 * Dark backgrounds shift from at least this OKLCH lightness. Near black, a
 * plain shift is invisible in sRGB (#000000 would hover as #010101).
 */
export const MIN_DARK_LIGHTNESS = 0.2;
/** Alpha of the inactive foreground, relative to the foreground. */
export const INACTIVE_FOREGROUND_ALPHA = 0.6;
/** Alpha of the inactive border, relative to the border. */
export const INACTIVE_BORDER_ALPHA = 0.5;

const BLACK: Color = { mode: "rgb", r: 0, g: 0, b: 0 };
const WHITE: Color = { mode: "rgb", r: 1, g: 1, b: 1 };

interface DeriveColorsArgs {
  background: Hex;
  overrides?: ColorOverrides;
}

/**
 * Builds the full `commandCenter.*` set from a background (toucan-v1/0004). Overrides
 * win, and colors derived from an overridden one build on the override.
 * Inputs come from the config parser, so they always parse.
 *
 * Known limit: a user-set foreground isn't checked against the derived hover
 * background, so a mid-tone background can make hover text hard to read.
 */
export function deriveColors({
  background,
  overrides = {},
}: DeriveColorsArgs): CommandCenterColors {
  const bg = fromHex(background);
  const dark = isDark(bg);

  const foreground = overrides.foreground ?? toHex(dark ? WHITE : BLACK);
  const border =
    overrides.border ??
    toHex(shiftLightness({ color: bg, amount: dark ? BORDER_SHIFT : -BORDER_SHIFT }));

  return {
    background: toHex(bg),
    foreground,
    activeBackground:
      overrides.activeBackground ??
      toHex(
        shiftLightness({
          color: bg,
          amount: dark ? ACTIVE_BACKGROUND_SHIFT : -ACTIVE_BACKGROUND_SHIFT,
        }),
      ),
    activeForeground: overrides.activeForeground ?? foreground,
    border,
    activeBorder: overrides.activeBorder ?? border,
    inactiveForeground:
      overrides.inactiveForeground ??
      toHex(fade({ color: fromHex(foreground), alpha: INACTIVE_FOREGROUND_ALPHA })),
    inactiveBorder:
      overrides.inactiveBorder ??
      toHex(fade({ color: fromHex(border), alpha: INACTIVE_BORDER_ALPHA })),
  };
}

/** Dark when white text has more WCAG contrast on it than black text. */
function isDark(color: Color): boolean {
  return wcagContrast(color, WHITE) > wcagContrast(color, BLACK);
}

interface ShiftLightnessArgs {
  color: Color;
  amount: number;
}

function shiftLightness({ color, amount }: ShiftLightnessArgs): Color {
  const oklch = toOklch(color);
  const from = amount > 0 ? Math.max(oklch.l, MIN_DARK_LIGHTNESS) : oklch.l;
  return { ...oklch, l: Math.min(1, Math.max(0, from + amount)) };
}

interface FadeArgs {
  color: Color;
  alpha: number;
}

function fade({ color, alpha }: FadeArgs): Color {
  return { ...color, alpha: (color.alpha ?? 1) * alpha };
}
