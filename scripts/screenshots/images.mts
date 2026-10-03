// The README screenshot script's image work, kept pure so it can be tested:
// decoding and re-encoding PNGs (which drops every metadata chunk), laying
// frames side by side, and encoding the hero GIF.
// import libraries
import { createRequire } from "node:module";
import { PNG } from "pngjs";

// import types
import type * as Gifenc from "gifenc";

// The CommonJS build, the same object under Node and Vitest (see scripts/vendor.d.ts).
// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- require() returns any; vendor.d.ts declares the module
const gifenc = createRequire(import.meta.url)("gifenc") as typeof Gifenc;

/** RGBA pixels, row by row. */
export interface Image {
  width: number;
  height: number;
  data: Uint8Array;
}

/** An RGBA color, each channel 0–255. */
export type Rgba = readonly [number, number, number, number];

const CHANNELS = 4;
/** The most colors a GIF frame's palette holds. */
const GIF_COLORS = 256;
/** zlib's strongest compression, for the smallest PNGs. */
const DEFLATE_LEVEL = 9;

export function decodePng(bytes: Uint8Array): Image {
  const png = PNG.sync.read(Buffer.from(bytes));
  return { width: png.width, height: png.height, data: new Uint8Array(png.data) };
}

/** A PNG of the pixels alone: no text, time or EXIF chunks survive. */
export function encodePng(image: Image): Uint8Array {
  const png = new PNG({ width: image.width, height: image.height });
  png.data = Buffer.from(image.data);
  return new Uint8Array(PNG.sync.write(png, { deflateLevel: DEFLATE_LEVEL }));
}

interface SideBySideArgs {
  images: readonly Image[];
  /** Pixels between two images. */
  gap: number;
  /** Fills the gaps and below shorter images. */
  background: Rgba;
}

/** The images in a row, left to right, top-aligned. */
export function sideBySide({ images, gap, background }: SideBySideArgs): Image {
  const width =
    images.reduce((sum, image) => sum + image.width, 0) + gap * Math.max(0, images.length - 1);
  const height = Math.max(0, ...images.map((image) => image.height));
  const data = new Uint8Array(width * height * CHANNELS);
  for (let pixel = 0; pixel < width * height; pixel++) {
    data.set(background, pixel * CHANNELS);
  }
  let left = 0;
  for (const image of images) {
    for (let row = 0; row < image.height; row++) {
      const from = row * image.width * CHANNELS;
      data.set(
        image.data.subarray(from, from + image.width * CHANNELS),
        (row * width + left) * CHANNELS,
      );
    }
    left += image.width + gap;
  }
  return { width, height, data };
}

interface StackedArgs {
  images: readonly Image[];
  /** Pixels between two images. */
  gap: number;
  /** Fills the gaps and right of narrower images. */
  background: Rgba;
}

/** The images in a column, top to bottom, left-aligned. */
export function stacked({ images, gap, background }: StackedArgs): Image {
  const width = Math.max(0, ...images.map((image) => image.width));
  const height =
    images.reduce((sum, image) => sum + image.height, 0) + gap * Math.max(0, images.length - 1);
  const data = new Uint8Array(width * height * CHANNELS);
  for (let pixel = 0; pixel < width * height; pixel++) {
    data.set(background, pixel * CHANNELS);
  }
  let top = 0;
  for (const image of images) {
    for (let row = 0; row < image.height; row++) {
      const from = row * image.width * CHANNELS;
      data.set(
        image.data.subarray(from, from + image.width * CHANNELS),
        (top + row) * width * CHANNELS,
      );
    }
    top += image.height + gap;
  }
  return { width, height, data };
}

interface ColorShareArgs {
  image: Image;
  color: Rgba;
  /** How far each channel may be off. */
  tolerance: number;
}

/** The share of pixels (0–1) that are the color, give or take the tolerance per channel. */
export function colorShare({ image, color, tolerance }: ColorShareArgs): number {
  const pixels = image.data.length / CHANNELS;
  let matches = 0;
  for (let at = 0; at < image.data.length; at += CHANNELS) {
    if (
      color.every(
        (channel, index) => Math.abs((image.data[at + index] ?? 0) - channel) <= tolerance,
      )
    ) {
      matches++;
    }
  }
  return pixels === 0 ? 0 : matches / pixels;
}

/** The image's most frequent color; transparent black for an empty image. */
export function dominantColor(image: Image): Rgba {
  const counts = new Map<number, number>();
  let best = 0;
  let bestCount = 0;
  for (let at = 0; at < image.data.length; at += CHANNELS) {
    const key = new DataView(image.data.buffer, image.data.byteOffset + at, CHANNELS).getUint32(0);
    const count = (counts.get(key) ?? 0) + 1;
    counts.set(key, count);
    if (count > bestCount) {
      best = key;
      bestCount = count;
    }
  }
  const view = new DataView(new ArrayBuffer(CHANNELS));
  view.setUint32(0, best);
  const [red = 0, green = 0, blue = 0, alpha = 0] = new Uint8Array(view.buffer);
  return [red, green, blue, alpha];
}

/** A GIF frame and how long it shows. */
export interface GifFrame {
  image: Image;
  delayMs: number;
}

/** A looping GIF of the frames, each with its own palette. */
export function encodeGif(frames: readonly GifFrame[]): Uint8Array {
  const gif = gifenc.GIFEncoder();
  for (const { image, delayMs } of frames) {
    const palette = gifenc.quantize(image.data, GIF_COLORS);
    gif.writeFrame(gifenc.applyPalette(image.data, palette), image.width, image.height, {
      palette,
      delay: delayMs,
    });
  }
  gif.finish();
  return gif.bytes();
}
