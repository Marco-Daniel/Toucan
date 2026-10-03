// `pnpm -C apps/site og-image`: renders the social media card to
// public/og-image.png (1200×630), which every page names as its Open Graph and
// Twitter image. The PNG is committed; `check:generated` renders it again and
// fails when the committed one is stale. Rendered like the extension's icon:
// resvg, no system fonts (the text is outlined), then re-encoded with pngjs so
// no metadata chunk survives.
// import libraries
import { readFileSync, writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";
import { PNG } from "pngjs";

// import utils
import { ogCardSvg } from "./og-card.mts";

// import consts
import { BRAND_COLORS } from "@toucan/brand/colors.consts.ts";

const OUT = new URL("../public/og-image.png", import.meta.url);
const WIDTH = 1200;
/** zlib's strongest compression, for the smallest PNG. */
const DEFLATE_LEVEL = 9;

const svg = ogCardSvg({
  template: readFileSync(new URL("../assets/og-card.svg", import.meta.url), "utf8"),
  iconSvg: readFileSync(
    new URL("../../../packages/brand/assets/icon.svg", import.meta.url),
    "utf8",
  ),
  colors: BRAND_COLORS,
});
const rendered = new Resvg(svg, {
  fitTo: { mode: "width", value: WIDTH },
  font: { loadSystemFonts: false },
})
  .render()
  .asPng();
const pixels = PNG.sync.read(Buffer.from(rendered));
const clean = new PNG({ width: pixels.width, height: pixels.height });
clean.data = pixels.data;
const png = PNG.sync.write(clean, { deflateLevel: DEFLATE_LEVEL });

if (process.argv.includes("--check")) {
  if (!Buffer.from(readFileSync(OUT)).equals(png)) {
    console.error("public/og-image.png is stale: run `pnpm -C apps/site og-image` and commit it.");
    process.exit(1);
  }
  console.log("public/og-image.png is up to date");
} else {
  writeFileSync(OUT, png);
  console.log(`public/og-image.png: ${pixels.width}×${pixels.height}, ${png.length} bytes`);
}
