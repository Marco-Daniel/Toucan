// import types
import type { Glyph } from "@toucan/brand/glyphs.types.ts";

/** `commandCenter.*` color keys Toucan owns and lets users override (ADR-0002, toucan-v1/0004). */
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

export const DEFAULT_GLYPH: Glyph = "square";

/** Glyphs earlier versions offered (glyph-set/0003): they read as square, with a warning. */
export const RETIRED_GLYPHS = ["double-circle", "check-circle"] as const;

/** Sidebar block styles (toucan-v1/0013). */
export const SIDEBAR_STYLES = ["full", "muted"] as const;

/** Sidebar block visibility modes (toucan-v1/0013). */
export const SIDEBAR_VISIBILITIES = ["always", "unfocused"] as const;
