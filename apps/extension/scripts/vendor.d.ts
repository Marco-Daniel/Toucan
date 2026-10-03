// Minimal types for untyped dependencies of the scripts.
declare module "svg2ttf" {
  export default function svg2ttf(
    svg: string,
    options?: { ts?: number; version?: string; description?: string; url?: string },
  ): { buffer: ArrayBuffer };
}

declare module "ttf2woff" {
  export default function ttf2woff(ttf: Uint8Array): { buffer: ArrayBuffer };
}

// The README screenshot script's GIF encoder, loaded with require: its CommonJS
// build hides the named exports from Node's ESM loader.
declare module "gifenc" {
  interface GifFrameOptions {
    palette: number[][];
    /** In milliseconds. */
    delay?: number;
  }
  interface GifEncoder {
    writeFrame(index: Uint8Array, width: number, height: number, options: GifFrameOptions): void;
    finish(): void;
    bytes(): Uint8Array;
  }
  export function GIFEncoder(): GifEncoder;
  export function quantize(rgba: Uint8Array, maxColors: number): number[][];
  export function applyPalette(rgba: Uint8Array, palette: number[][]): Uint8Array;
}
