import type { RepoConfig } from "../../shared/config/config.util.ts";
import { presetName } from "../../shared/color/contrast.util.ts";

interface AccessibilityLabelArgs {
  name: string;
  config: Pick<RepoConfig, "background" | "glyph">;
}

/** What a screen reader announces: the repo, its preset color if any, and the glyph. */
export function accessibilityLabel({ name, config }: AccessibilityLabelArgs): string {
  const color = presetName(config.background);
  const { glyph } = config;
  return color ? `Toucan: ${name}, ${color} ${glyph}` : `Toucan: ${name}, ${glyph}`;
}
