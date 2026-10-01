import type { RepoConfig } from "./config.ts";
import { presetName } from "./contrast.ts";

/** What a screen reader announces: the repo, its preset color if any, and the glyph. */
export function accessibilityLabel(
  name: string,
  config: Pick<RepoConfig, "background" | "glyph">,
): string {
  const color = presetName(config.background);
  const glyph = config.glyph.replaceAll("-", " ");
  return color ? `Toucan: ${name}, ${color} ${glyph}` : `Toucan: ${name}, ${glyph}`;
}
