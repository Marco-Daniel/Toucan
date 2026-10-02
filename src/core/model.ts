/**
 * A `#rrggbb` or `#rrggbbaa` string produced by `toHex`. The brand makes sure
 * only validated colors reach the deriver and the settings writes.
 */
export type Hex = string & { readonly __brand: "Hex" };

const HEX_FORM = /^#[\da-f]{6}(?:[\da-f]{2})?$/;

/** Whether `value` is a lowercase `#rrggbb` or `#rrggbbaa`, the form `toHex` produces. */
export function isHex(value: string): value is Hex {
  return HEX_FORM.test(value);
}

/** A known color in hex form as a Hex. Throws on anything else, so a typo fails at load. */
export function asHex(value: string): Hex {
  if (!isHex(value)) {
    throw new Error(`Not a lowercase #rrggbb or #rrggbbaa color: ${value}`);
  }
  return value;
}

/** `commandCenter.*` color keys Toucan owns and lets users override (0003, 0004). */
export const COMMAND_CENTER_KEYS = [
  "background",
  "foreground",
  "activeBackground",
  "activeForeground",
  "border",
  "activeBorder",
  "inactiveForeground",
  "inactiveBorder",
] as const;

export type CommandCenterKey = (typeof COMMAND_CENTER_KEYS)[number];
export type CommandCenterColors = Record<CommandCenterKey, Hex>;
export type ColorOverrides = Partial<Omit<CommandCenterColors, "background">>;

/** Curated status bar glyphs, in group order (glyph-set plan, 0002 and 0007). */
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

export type Glyph = (typeof GLYPHS)[number];
export const DEFAULT_GLYPH: Glyph = "square";

/** Glyphs earlier versions offered (glyph-set plan, 0003): they read as square, with a warning. */
export const RETIRED_GLYPHS = ["double-circle", "check-circle"] as const;

/** The themed groups Set Glyph shows, together covering GLYPHS in order (glyph-set 0002, 0007). */
export const GLYPH_GROUPS: readonly { label: string; glyphs: readonly Glyph[] }[] = [
  { label: "Shapes", glyphs: ["square", "bar", "pill", "circle"] },
  { label: "Toucan's world", glyphs: ["toucan", "sun", "leaf", "drop", "moon"] },
  { label: "Characters", glyphs: ["alien", "ghost", "robot", "cat"] },
  { label: "Fun & dev", glyphs: ["bolt", "heart", "star", "rocket"] },
];

/** Sidebar block styles (0013). */
export const SIDEBAR_STYLES = ["full", "muted"] as const;
export type SidebarStyle = (typeof SIDEBAR_STYLES)[number];

/** Sidebar block visibility modes (0013). */
export const SIDEBAR_VISIBILITIES = ["always", "unfocused"] as const;
export type SidebarVisibility = (typeof SIDEBAR_VISIBILITIES)[number];
