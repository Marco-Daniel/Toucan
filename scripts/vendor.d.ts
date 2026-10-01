// Minimal types for the font generator's untyped dependencies.
declare module "svg2ttf" {
  export default function svg2ttf(
    svg: string,
    options?: { ts?: number; version?: string; description?: string; url?: string },
  ): { buffer: ArrayBuffer };
}

declare module "ttf2woff" {
  export default function ttf2woff(ttf: Uint8Array): { buffer: ArrayBuffer };
}
