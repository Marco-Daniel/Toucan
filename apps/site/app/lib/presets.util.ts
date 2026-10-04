// import consts
import { BRAND_PRESETS } from "@toucan/brand/presets.consts.ts";

/** A preset name as a class name part: "Beak Red" → "beak-red". */
export function presetSlug(name: string): string {
  return name.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-");
}

/**
 * The class that sets `--preset` to a preset's color (from presetCssClasses),
 * for `bg-(--preset)` or `text-(--preset)`: no style attribute, so the site's
 * Content-Security-Policy needs no inline styles. Throws on an unknown name,
 * so a renamed preset fails the build.
 */
export function presetClass(name: string): string {
  if (!BRAND_PRESETS.some((preset) => preset.name === name)) {
    throw new Error(`No preset named ${name}`);
  }
  return `preset-${presetSlug(name)}`;
}
