// import types
import type {
  COMMAND_CENTER_KEYS,
  GLYPHS,
  SIDEBAR_STYLES,
  SIDEBAR_VISIBILITIES,
} from "./model.consts.ts";

/**
 * A `#rrggbb` or `#rrggbbaa` string produced by `toHex`. The brand makes sure
 * only validated colors reach the deriver and the settings writes.
 */
export type Hex = string & { readonly __brand: "Hex" };

export type CommandCenterKey = (typeof COMMAND_CENTER_KEYS)[number];
export type CommandCenterColors = Record<CommandCenterKey, Hex>;
export type ColorOverrides = Partial<Omit<CommandCenterColors, "background">>;
export type Glyph = (typeof GLYPHS)[number];
export type SidebarStyle = (typeof SIDEBAR_STYLES)[number];
export type SidebarVisibility = (typeof SIDEBAR_VISIBILITIES)[number];
