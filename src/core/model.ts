/**
 * A `#rrggbb` or `#rrggbbaa` string produced by `toHex`. The brand makes sure
 * only validated colors reach the deriver and the settings writes.
 */
export type Hex = string & { readonly __brand: "Hex" };

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

/** Curated status bar glyphs (0012). */
export const GLYPHS = [
  "square",
  "bar",
  "pill",
  "circle",
  "double-circle",
  "heart",
  "star",
  "check-circle",
] as const;

export type Glyph = (typeof GLYPHS)[number];
export const DEFAULT_GLYPH: Glyph = "square";

/** Sidebar block styles (0013). */
export const SIDEBAR_STYLES = ["full", "muted"] as const;
export type SidebarStyle = (typeof SIDEBAR_STYLES)[number];

/** Sidebar block visibility modes (0013). */
export const SIDEBAR_VISIBILITIES = ["always", "unfocused"] as const;
export type SidebarVisibility = (typeof SIDEBAR_VISIBILITIES)[number];
