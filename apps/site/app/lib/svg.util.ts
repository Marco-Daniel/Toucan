// Turns the brand's SVG files into markup the site can inline: several copies
// on one page need their own ids, the hero shows the icon's scene without its
// tile, and the glyph chips draw each glyph in the current text color.

interface ScopeSvgIdsArgs {
  svg: string;
  /** Prefixed to every id, so two copies of one SVG on a page don't share masks. */
  prefix: string;
}

/** The SVG with every id, and every reference to one, prefixed. */
export function scopeSvgIds({ svg, prefix }: ScopeSvgIdsArgs): string {
  return svg
    .replaceAll(/\bid="([^"]+)"/g, `id="${prefix}-$1"`)
    .replaceAll(/url\(#([^)]+)\)/g, `url(#${prefix}-$1)`)
    .replaceAll(/href="#([^"]+)"/g, `href="#${prefix}-$1"`);
}

interface SizedSvgArgs {
  svg: string;
  className: string;
}

/** The SVG with its fixed width and height dropped (CSS sizes it) and a class added. */
export function sizedSvg({ svg, className }: SizedSvgArgs): string {
  const open = /^<svg\b[^>]*>/.exec(svg)?.[0];
  if (open === undefined) {
    throw new Error("Not an SVG document");
  }
  const sized = open
    .replaceAll(/\s(?:width|height)="[^"]*"/g, "")
    .replace(/^<svg\b/, `<svg class="${className}" aria-hidden="true"`);
  return sized + svg.slice(open.length);
}

/** The icon's tile: a rounded square the size of the whole icon. */
const TILE = /<rect width="128" height="128" rx="28" fill="[^"]+"\/>/;
/** The horizon line the sun sinks behind. */
const HORIZON = /<rect x="0" y="73" width="128" height="2\.5" fill="([^"]+)"\/>/;

/**
 * The hero's scene (website/0011): the icon without its tile, with a second,
 * thinner horizon line under the first. Throws when the icon no longer has
 * the parts it changes, so a redrawn icon fails the build instead of the page.
 */
export function heroScene(iconSvg: string): string {
  const horizon = HORIZON.exec(iconSvg);
  if (!TILE.test(iconSvg) || horizon === null) {
    throw new Error("The icon no longer has the tile and horizon the hero changes");
  }
  const [line, color] = horizon;
  return iconSvg
    .replace(TILE, "")
    .replace(line, `${line}<rect x="0" y="78" width="128" height="1.6" fill="${color}"/>`);
}

/** A glyph as the site draws it: its view box and its one filled path. */
export interface GlyphShape {
  viewBox: string;
  d: string;
}

/** The shape in a glyph SVG that `pnpm font` wrote: one path in a view box. Throws on anything else. */
export function glyphShape(svg: string): GlyphShape {
  const viewBox = /\bviewBox="([^"]+)"/.exec(svg)?.[1];
  const paths = [...svg.matchAll(/<path d="([^"]+)"\/>/g)];
  const [path] = paths;
  if (viewBox === undefined || paths.length !== 1 || path?.[1] === undefined) {
    throw new Error("Not a glyph SVG: expected a view box and exactly one path");
  }
  return { viewBox, d: path[1] };
}
