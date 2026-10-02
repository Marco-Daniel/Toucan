// Turns glyph SVGs into Toucan's icon font. Shared by `pnpm font` and the
// test that checks the font draws what the SVGs draw.
import { Readable } from "node:stream";
import svg2ttf from "svg2ttf";
import { SVGIcons2SVGFontStream } from "svgicons2svgfont";
import ttf2woff from "ttf2woff";

export interface FontIcon {
  name: string;
  codepoint: number;
  svg: string;
}

export async function buildFont(
  icons: readonly FontIcon[],
): Promise<{ svgFont: string; ttf: Uint8Array; woff: Uint8Array }> {
  const fontStream = new SVGIcons2SVGFontStream({
    fontName: "toucan-icons",
    // 16 SVG units span the em, with the baseline 1/8 up, so glyphs line up
    // with the built-in codicons around them.
    fontHeight: 1000,
    descent: 125,
    round: 1000,
  });
  let svgFont = "";
  fontStream.on("data", (chunk: string | Buffer) => {
    svgFont += chunk.toString();
  });
  const done = new Promise<void>((resolve, reject) => {
    fontStream.on("end", resolve);
    fontStream.on("error", reject);
  });
  for (const { name, codepoint, svg } of icons) {
    fontStream.write(
      Object.assign(Readable.from([svg]), {
        metadata: { name, unicode: [String.fromCodePoint(codepoint)] },
      }),
    );
  }
  fontStream.end();
  await done;
  // A fixed timestamp keeps the output byte-identical between runs.
  const ttf = new Uint8Array(
    svg2ttf(svgFont, { ts: 0, description: "Toucan icons", url: "" }).buffer,
  );
  return { svgFont, ttf, woff: new Uint8Array(ttf2woff(ttf).buffer) };
}
