// import consts
import { LOW_CONTRAST_HINT } from "../../shared/color/contrast.util.ts";

// import types
import type { Hex } from "../../shared/model/model.types.ts";

interface PresetDescriptionArgs {
  hex: Hex;
  /** Whether it's the repository's color now. */
  isCurrent: boolean;
  /** Whether it may be hard to see on the status bar (toucan-v1/0018). */
  isLowContrast: boolean;
}

/**
 * A preset's description in Pick Preset Color, on the same line as its name:
 * the hex, then whether it's current, then the contrast warning. Marked, not
 * hidden: the user can still pick it.
 */
export function presetDescription({
  hex,
  isCurrent,
  isLowContrast,
}: PresetDescriptionArgs): string {
  return [
    hex,
    ...(isCurrent ? ["current"] : []),
    ...(isLowContrast ? [`$(warning) ${LOW_CONTRAST_HINT}`] : []),
  ].join(" · ");
}
