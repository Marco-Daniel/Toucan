// The brand's SVGs as text, bundled at build time, and the README screenshots
// as URLs the build copies into the site.
// import utils
import { glyphShape, heroScene } from "./svg.util.ts";

// import consts
import ICON_SVG from "@toucan/brand/assets/icon.svg?raw";

// import types
import type { Glyph } from "@toucan/brand/glyphs.types.ts";
import type { GlyphShape } from "./svg.util.ts";

const GLYPH_SVGS = import.meta.glob<string>("@toucan/brand/assets/glyphs/*.svg", {
  query: "?raw",
  import: "default",
  eager: true,
});

const SCREENSHOTS = import.meta.glob<string>("@extension-media/readme/*.{png,gif}", {
  query: "?url",
  import: "default",
  eager: true,
});

/** The hero's scene, from the icon. */
export const HERO_SVG = heroScene(ICON_SVG);

/** A glyph's shape, from the brand's SVG; throws at build time when the brand has none. */
export function glyphShapeOf(glyph: Glyph): GlyphShape {
  const svg = Object.entries(GLYPH_SVGS).find(([path]) => path.endsWith(`/${glyph}.svg`))?.[1];
  if (svg === undefined) {
    throw new Error(`No brand SVG for the ${glyph} glyph`);
  }
  return glyphShape(svg);
}

/** Each README screenshot's URL in the built site, by file name. */
export const SCREENSHOT_URLS: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(SCREENSHOTS).map(([path, url]) => [path.slice(path.lastIndexOf("/") + 1), url]),
);

/** The URL of a README screenshot. Throws on a missing one, so a renamed screenshot fails the build. */
export function screenshotUrl(name: string): string {
  const url = SCREENSHOT_URLS[name];
  if (url === undefined) {
    throw new Error(`No README screenshot named ${name}`);
  }
  return url;
}
