import { GLYPH_PATHS } from "../generated/glyphPaths.ts";
import { HEIGHT, shapeSvg } from "./glyphFont.ts";
import { GLYPH_GROUPS, type Glyph, type Hex } from "./model.ts";

export { FONT_CODEPOINTS } from "./glyphFont.ts";

/**
 * Solid codicon used where no glyph applies (0005). VS Code gives extensions
 * no signal when a contributed icon font fails to load, so don't try to
 * detect that and swap this in.
 */
export const FALLBACK_ICON = "circle-large-filled";

/**
 * Escapes `$(…)` in user text such as a folder name, so VS Code shows it
 * literally instead of as an icon. Its label renderer prints `\$(x)` as `$(x)`.
 */
export function escapeIcons(text: string): string {
  return text.replaceAll("$(", "\\$(");
}

/** The icon id Toucan contributes for a glyph (package.json `icons`). */
export function glyphIconId(glyph: Glyph): string {
  return `toucan-${glyph}`;
}

/** `$(…)` text for a status bar item or markdown string. */
export function glyphIcon(glyph: Glyph): string {
  return `$(${glyphIconId(glyph)})`;
}

/**
 * Standalone SVG of the glyph in `color`, `height` pixels high, keeping the
 * glyph's aspect ratio. Used for tooltip swatches and the sidebar block.
 */
export function glyphSvg(glyph: Glyph, color: Hex, height = HEIGHT): string {
  const { width, d } = GLYPH_PATHS[glyph];
  return shapeSvg(width, d, color, height);
}

/** `data:` URI for an SVG, as accepted by markdown tooltips (0005). */
export function svgDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

/**
 * VS Code's `QuickPickItemKind.Separator`. Core code can't import `vscode`, so
 * the value is written here and a test pins it against VS Code's API types.
 */
export const QUICK_PICK_SEPARATOR = -1;

/** A Set Glyph quick pick item: a group separator, or a glyph with its swatch. */
export interface GlyphPickItem<Icon> {
  label: string;
  kind?: typeof QUICK_PICK_SEPARATOR;
  glyph?: Glyph;
  iconPath?: Icon;
  description?: string;
}

/** Set Glyph's list: a separator per group, then its glyphs, the current one marked. */
export function glyphPickItems<Icon>(
  current: Glyph,
  icon: (glyph: Glyph) => Icon,
): GlyphPickItem<Icon>[] {
  const items: GlyphPickItem<Icon>[] = [];
  for (const { label, glyphs } of GLYPH_GROUPS) {
    items.push({ label, kind: QUICK_PICK_SEPARATOR });
    for (const glyph of glyphs) {
      const item: GlyphPickItem<Icon> = { label: glyph, glyph, iconPath: icon(glyph) };
      if (glyph === current) {
        item.description = "current";
      }
      items.push(item);
    }
  }
  return items;
}
