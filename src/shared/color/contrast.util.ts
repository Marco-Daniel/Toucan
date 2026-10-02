// import libraries
import { wcagContrast } from "culori/fn";

// import utils
import { fromHex, normalizeColor } from "./color.util.ts";
import { isRecord } from "../records/records.util.ts";
import { asHex } from "./hex.util.ts";

// import consts
import { PRESETS } from "./presets.consts.ts";

// import types
import type { Hex } from "../model/model.types.ts";

/** Below this WCAG contrast against the status bar, a color may be hard to see (toucan-v1/0018). */
export const MIN_STATUS_BAR_CONTRAST = 3;

export type ThemeKind = "light" | "dark" | "highContrast";

/** Representative status bar backgrounds: Default Light Modern and Dark Modern. */
const KIND_DEFAULTS: Record<"light" | "dark", Hex> = {
  light: asHex("#f8f8f8"),
  dark: asHex("#181818"),
};

interface StatusBarBackgroundArgs {
  kind: ThemeKind;
  themeName: string | undefined;
  customizations: unknown;
}

/**
 * The status bar background to compare against (toucan-v1/0018). Extensions can't read
 * a theme's resolved colors, so: the user's override for the active theme
 * (a `"[Theme Name]"` block wins, as in VS Code), then their top-level
 * override, then a representative color for the theme kind. `undefined` in
 * high-contrast themes, where VS Code draws status bar items with borders.
 */
export function statusBarBackground(input: StatusBarBackgroundArgs): Hex | undefined {
  if (input.kind === "highContrast") {
    return undefined;
  }
  const custom = isRecord(input.customizations) ? input.customizations : {};
  const scoped = input.themeName === undefined ? undefined : custom[`[${input.themeName}]`];
  for (const source of [isRecord(scoped) ? scoped : {}, custom]) {
    const value = source["statusBar.background"];
    const hex = typeof value === "string" ? normalizeColor(value) : undefined;
    if (hex) {
      return hex;
    }
  }
  return KIND_DEFAULTS[input.kind];
}

interface ActiveThemeNameArgs {
  kind: ThemeKind;
  autoDetect: unknown;
  colorTheme: unknown;
  preferredDark: unknown;
  preferredLight: unknown;
}

/**
 * The name of the active color theme, for the `"[Theme Name]"` lookup. With
 * `window.autoDetectColorScheme` on, VS Code uses the preferred theme for the
 * OS scheme instead of `workbench.colorTheme`.
 */
export function activeThemeName(input: ActiveThemeNameArgs): string | undefined {
  const name =
    input.autoDetect === true && input.kind !== "highContrast"
      ? input.kind === "dark"
        ? input.preferredDark
        : input.preferredLight
      : input.colorTheme;
  return typeof name === "string" ? name : undefined;
}

interface LowContrastArgs {
  color: Hex;
  background: Hex | undefined;
}

/** Whether `color` may be hard to see on `background`. */
export function lowContrast({ color, background }: LowContrastArgs): boolean {
  return (
    background !== undefined &&
    wcagContrast(fromHex(color), fromHex(background)) < MIN_STATUS_BAR_CONTRAST
  );
}

/** The warning both pickers show (toucan-v1/0018): no measured ratio, since the background is a guess. */
export const LOW_CONTRAST_WARNING = "May be hard to see on the status bar.";

/** The name of the preset with this color, if there is one. */
export function presetName(hex: Hex): string | undefined {
  return PRESETS.find((preset) => preset.hex === hex)?.name;
}
