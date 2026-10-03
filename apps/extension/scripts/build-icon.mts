// Renders the extension icon, media/icon.png, from the brand's icon
// (packages/brand/assets/icon.svg):
// 256×256 with a transparent background, so the rounded corners stay clear.
// The PNG is committed; CI re-renders it and fails if it drifted.
// import libraries
import { readFileSync, writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";

const MEDIA = new URL("../media/", import.meta.url);
const SIZE = 256;

const svg = readFileSync(new URL("../../../packages/brand/assets/icon.svg", MEDIA), "utf8");
const png = new Resvg(svg, {
  fitTo: { mode: "width", value: SIZE },
  // No text in the icon: skip system fonts, so the output can't depend on the machine.
  font: { loadSystemFonts: false },
})
  .render()
  .asPng();
writeFileSync(new URL("icon.png", MEDIA), png);
console.log(`media/icon.png: ${SIZE}×${SIZE}, ${png.length} bytes`);
