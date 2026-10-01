import { opaque, parseColor, toHex } from "./color.ts";
import { glyphSvg } from "./glyphs.ts";
import type { CommandCenterColors, Glyph, Hex, SidebarStyle } from "./model.ts";

/** Fill alpha of the `muted` style (0013). */
export const MUTED_ALPHA = 0.25;

export interface SidebarBlockContent {
  name: string;
  glyph: Glyph;
  colors: CommandCenterColors;
  style: SidebarStyle;
}

/**
 * The block's whole page (0006, 0013): no scripts and a CSP that only allows
 * inline styles, painted in the repo color with the glyph large in the middle
 * and the repo name underneath. `full` is the solid color with the derived
 * foreground; `muted` is a faint fill over the theme with glyph and name in
 * the repo color.
 */
export function sidebarBlockHtml({ name, glyph, colors, style }: SidebarBlockContent): string {
  const muted = style === "muted";
  const fill = muted ? withAlpha(colors.background, MUTED_ALPHA) : colors.background;
  const ink = muted ? colors.background : opaqueHex(colors.foreground);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline';">
<style>
html, body { margin: 0; height: 100%; }
body {
  background: ${fill};
  color: ${ink};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  font-family: var(--vscode-font-family);
  font-size: 15px;
  font-weight: 600;
  overflow: hidden;
}
svg { max-width: 60%; height: auto; }
.name {
  /* Muted: the repo color on a tint of itself is too faint for text, so the name uses the theme's text color. */
  color: ${muted ? "var(--vscode-foreground)" : ink};
  max-width: 90%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
</head>
<body>
${glyphSvg(glyph, ink, 64)}
<div class="name">${escapeHtml(name)}</div>
</body>
</html>`;
}

function withAlpha(hex: Hex, alpha: number): Hex {
  const color = parseColor(hex);
  return color ? toHex({ ...color, alpha }) : hex;
}

function opaqueHex(hex: Hex): Hex {
  const color = parseColor(hex);
  return color ? toHex(opaque(color)) : hex;
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
