// import libraries
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// import utils
import { imageSize } from "../../app/lib/image.util.ts";

const screenshot = (name: string) =>
  new Uint8Array(readFileSync(new URL(`../../../extension/media/readme/${name}`, import.meta.url)));

describe("imageSize", () => {
  it("reads a PNG's size from its header", () => {
    expect(imageSize(screenshot("status-bar.png"))).toEqual({ width: 2200, height: 272 });
    expect(imageSize(screenshot("set-glyph.png"))).toEqual({ width: 825, height: 495 });
  });

  it("reads a GIF's size from its header", () => {
    const gif = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x2c, 0x01, 0xc8, 0x00]);
    expect(imageSize(gif)).toEqual({ width: 300, height: 200 });
  });

  it("reads a PNG header that ends right after the size", () => {
    const png = new Uint8Array(24);
    png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    png.set([0, 0, 0x03, 0x39], 16);
    png.set([0, 0, 0x01, 0xef], 20);
    expect(imageSize(png)).toEqual({ width: 825, height: 495 });
  });

  it("throws on anything else, or a header cut short", () => {
    expect(() => imageSize(new Uint8Array(32))).toThrow("Not a PNG or GIF image");
    expect(() => imageSize(new Uint8Array([1, 2, 3]))).toThrow("Not a PNG or GIF image");
    expect(() => imageSize(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0, 0]))).toThrow(
      "Not a PNG or GIF image",
    );
    expect(() => imageSize(new Uint8Array([0x47, 0x49, 0x46, 0x38]))).toThrow(
      "Not a PNG or GIF image",
    );
  });
});
