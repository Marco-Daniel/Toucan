// The README screenshots' sizes, read from their headers at build time, so the
// docs pages can give every image its width and height. Server-only: the
// images are inlined here just to be measured, and never reach the browser.
// import utils
import { imageSize } from "./image.util.ts";

// import consts
import { SCREENSHOT_URLS } from "./brand.assets.ts";

// import types
import type { ImageSize } from "./image.util.ts";
import type { MarkdownImage } from "./markdown.util.ts";

const INLINE = import.meta.glob<string>("@extension-media/readme/*.{png,gif}", {
  query: "?inline",
  import: "default",
  eager: true,
});

/** Each README screenshot's size, by file name. */
export const SCREENSHOT_SIZES: Readonly<Record<string, ImageSize>> = Object.fromEntries(
  Object.entries(INLINE).map(([path, dataUrl]) => [
    path.slice(path.lastIndexOf("/") + 1),
    imageSize(Buffer.from(dataUrl.slice(dataUrl.indexOf(",") + 1), "base64")),
  ]),
);

/** The images the docs pages may show: each README screenshot's URL and size, by file name. */
export const DOCS_IMAGES: Readonly<Record<string, MarkdownImage>> = Object.fromEntries(
  Object.entries(SCREENSHOT_URLS).flatMap(([name, src]) => {
    const size = SCREENSHOT_SIZES[name];
    return size === undefined ? [] : [[name, { src, ...size }]];
  }),
);
