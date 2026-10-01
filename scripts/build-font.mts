// Builds Toucan's icon font from the glyph shapes in src/core/glyphs.ts, so
// the font and the tooltip/sidebar swatches can't drift apart. Writes the SVG
// sources to media/icons and the font to media/toucan-icons.woff.
import { mkdirSync, writeFileSync } from "node:fs";
import { Readable } from "node:stream";
import svg2ttf from "svg2ttf";
import { SVGIcons2SVGFontStream } from "svgicons2svgfont";
import ttf2woff from "ttf2woff";
import { FONT_CODEPOINTS, glyphSvg, type FontGlyph } from "../src/core/glyphs.ts";
import type { Hex } from "../src/core/model.ts";

const MEDIA = new URL("../media/", import.meta.url);
const ICONS = new URL("icons/", MEDIA);
const BLACK = "#000000" as Hex;

mkdirSync(ICONS, { recursive: true });

const fontStream = new SVGIcons2SVGFontStream({
  fontName: "toucan-icons",
  // Same metrics as the status bar spike: 16 SVG units span the em, with the
  // baseline 1/8 up, so glyphs line up with codicons.
  fontHeight: 1000,
  descent: 125,
  round: 1000,
});

let svgFontText = "";
fontStream.on("data", (chunk: string | Buffer) => {
  svgFontText += chunk.toString();
});
const svgFont = new Promise<string>((resolve, reject) => {
  fontStream.on("end", () => resolve(svgFontText));
  fontStream.on("error", reject);
});

for (const [name, codepoint] of Object.entries(FONT_CODEPOINTS) as [FontGlyph, number][]) {
  const svg = glyphSvg(name, BLACK);
  writeFileSync(new URL(`${name}.svg`, ICONS), `${svg}\n`);
  const icon = Object.assign(Readable.from([svg]), {
    metadata: { name, unicode: [String.fromCodePoint(codepoint)] },
  });
  fontStream.write(icon);
}
fontStream.end();

// A fixed timestamp keeps the output byte-identical between runs.
const ttf = svg2ttf(await svgFont, { ts: 0, description: "Toucan icons", url: "" });
const woff = ttf2woff(new Uint8Array(ttf.buffer));
writeFileSync(new URL("toucan-icons.woff", MEDIA), new Uint8Array(woff.buffer));
console.log("Wrote media/toucan-icons.woff and media/icons/*.svg");
