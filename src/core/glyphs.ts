import type { Glyph, Hex } from "./model.ts";

interface GlyphShape {
  /** Icon id for `$(…)`: Toucan's own font icon or a built-in codicon (0012). */
  icon: string;
  /** SVG viewBox width; the height is always 16. */
  width: number;
  /** SVG body drawn in `currentColor`. */
  body: string;
}

/** Private-use codepoints of the glyphs in Toucan's own icon font. */
export const FONT_CODEPOINTS = { pill: 0xe000, square: 0xe001, bar: 0xe002 } as const;
export type FontGlyph = keyof typeof FONT_CODEPOINTS;

/**
 * Solid codicon used where no glyph applies (0005). VS Code gives extensions
 * no signal when a contributed icon font fails to load, so don't try to
 * detect that and swap this in.
 */
export const FALLBACK_ICON = "circle-large-filled";

const HEIGHT = 16;

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Codicon glyphs reuse the codicon's own path, so the tooltip swatch and the
 * sidebar block match the status bar icon. Paths from @vscode/codicons 0.0.46,
 * © Microsoft, CC BY 4.0 (https://github.com/microsoft/vscode-codicons).
 */
function codicon(path: string): string {
  return `<path d="${path}"/>`;
}

const SHAPES: Record<Glyph, GlyphShape> = {
  square: { icon: "toucan-square", width: 16, body: '<rect x="1" y="1" width="14" height="14"/>' },
  bar: { icon: "toucan-bar", width: 6, body: '<rect x="1" y="0" width="4" height="16"/>' },
  pill: {
    icon: "toucan-pill",
    width: 44,
    body: '<rect x="1" y="1" width="42" height="14" rx="7"/>',
  },
  circle: {
    icon: "circle-large-filled",
    width: 16,
    body: codicon(
      "M8 1C8.64258 1 9.26237 1.08431 9.85938 1.25293C10.4564 1.41699 11.0124 1.65169 11.5273 1.95703C12.0469 2.26237 12.5186 2.62923 12.9424 3.05762C13.3708 3.48145 13.7376 3.95312 14.043 4.47266C14.3483 4.98763 14.583 5.54362 14.7471 6.14062C14.9157 6.73763 15 7.35742 15 8C15 8.64258 14.9157 9.26237 14.7471 9.85938C14.583 10.4564 14.3483 11.0146 14.043 11.5342C13.7376 12.0492 13.3708 12.5208 12.9424 12.9492C12.5186 13.373 12.0469 13.7376 11.5273 14.043C11.0124 14.3483 10.4564 14.5853 9.85938 14.7539C9.26237 14.918 8.64258 15 8 15C7.35742 15 6.73763 14.918 6.14062 14.7539C5.54362 14.5853 4.98535 14.3483 4.46582 14.043C3.95085 13.7376 3.47917 13.373 3.05078 12.9492C2.62695 12.5208 2.26237 12.0492 1.95703 11.5342C1.65169 11.0146 1.41471 10.4564 1.24609 9.85938C1.08203 9.26237 1 8.64258 1 8C1 7.35742 1.08203 6.73763 1.24609 6.14062C1.41471 5.54362 1.65169 4.98763 1.95703 4.47266C2.26237 3.95312 2.62695 3.48145 3.05078 3.05762C3.47917 2.62923 3.95085 2.26237 4.46582 1.95703C4.98535 1.65169 5.54362 1.41699 6.14062 1.25293C6.73763 1.08431 7.35742 1 8 1Z",
    ),
  },
  "double-circle": {
    icon: "record",
    width: 16,
    body: codicon(
      "M8 12C10.2091 12 12 10.2091 12 8C12 5.79086 10.2091 4 8 4C5.79086 4 4 5.79086 4 8C4 10.2091 5.79086 12 8 12ZM8 1C4.13401 1 1 4.13401 1 8C1 11.866 4.13401 15 8 15C11.866 15 15 11.866 15 8C15 4.13401 11.866 1 8 1ZM2 8C2 4.68629 4.68629 2 8 2C11.3137 2 14 4.68629 14 8C14 11.3137 11.3137 14 8 14C4.68629 14 2 11.3137 2 8Z",
    ),
  },
  heart: {
    icon: "heart-filled",
    width: 16,
    body: codicon(
      "M8.02199 14.072C7.89399 14.072 7.76599 14.023 7.66799 13.926L2.10399 8.36098C1.53799 7.79698 0.997986 6.89098 0.997986 5.69898C0.997986 3.94498 2.32599 2.00098 4.72799 2.00098C5.70299 2.00098 6.67899 2.35798 7.39299 3.07098L7.99499 3.67198L8.58699 3.07698C9.30499 2.35998 10.266 2.00298 11.229 2.00298C14.204 2.00298 14.998 4.68498 14.998 5.75298C14.998 6.70998 14.636 7.66598 13.912 8.39398L8.37599 13.927C8.27799 14.025 8.14999 14.073 8.02199 14.073V14.072Z",
    ),
  },
  star: {
    icon: "star-full",
    width: 16,
    body: codicon(
      "M15.022 7.25497L12.203 10.003L12.869 13.883C12.917 14.165 12.844 14.438 12.664 14.654C12.479 14.872 12.205 15.001 11.929 15.001C11.775 15.001 11.626 14.963 11.485 14.89L8.00101 13.057L4.51701 14.889C4.13401 15.093 3.62401 14.991 3.34001 14.657C3.15801 14.439 3.08501 14.165 3.13201 13.884L3.79801 10.004L0.979007 7.25597C0.714007 6.99797 0.624007 6.63297 0.737007 6.27997C0.853007 5.92497 1.14001 5.68197 1.50701 5.62797L5.40301 5.06197L7.14501 1.53197C7.47301 0.865971 8.52801 0.865971 8.85601 1.53197L10.598 5.06197L14.494 5.62797C14.862 5.68197 15.149 5.92397 15.264 6.27597C15.378 6.63197 15.286 6.99697 15.022 7.25497Z",
    ),
  },
  "check-circle": {
    icon: "pass-filled",
    width: 16,
    body: codicon(
      "M8 1C4.14 1 1 4.14 1 8C1 11.86 4.14 15 8 15C11.86 15 15 11.86 15 8C15 4.14 11.86 1 8 1ZM11.354 6.354L7.354 10.354C7.256 10.452 7.128 10.5 7 10.5C6.872 10.5 6.744 10.451 6.646 10.354L4.646 8.354C4.451 8.159 4.451 7.842 4.646 7.647C4.841 7.452 5.158 7.452 5.353 7.647L6.999 9.293L10.645 5.647C10.84 5.452 11.157 5.452 11.352 5.647C11.547 5.842 11.547 6.159 11.352 6.354H11.354Z",
    ),
  },
};

/**
 * Escapes `$(…)` in user text such as a folder name, so VS Code shows it
 * literally instead of as an icon. Its label renderer prints `\$(x)` as `$(x)`.
 */
export function escapeIcons(text: string): string {
  return text.replaceAll("$(", "\\$(");
}

/** `$(…)` text for a status bar item or markdown string. */
export function glyphIcon(glyph: Glyph): string {
  return `$(${SHAPES[glyph].icon})`;
}

/**
 * Standalone SVG of the glyph in `color`, `height` pixels high, keeping the
 * glyph's aspect ratio. Used for tooltip swatches and the sidebar block.
 */
export function glyphSvg(glyph: Glyph, color: Hex, height = HEIGHT): string {
  const { width, body } = SHAPES[glyph];
  const pixelWidth = round((width / HEIGHT) * height);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${pixelWidth}" height="${height}" ` +
    `viewBox="0 0 ${width} ${HEIGHT}" fill="${color}" color="${color}">${body}</svg>`
  );
}

/** `data:` URI for an SVG, as accepted by markdown tooltips (0005). */
export function svgDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}
