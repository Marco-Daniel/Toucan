/** An image's size in pixels. */
export interface ImageSize {
  width: number;
  height: number;
}

/** The first bytes of every PNG and GIF, as Latin-1 text. */
const PNG_SIGNATURE = "\u0089PNG";
const GIF_SIGNATURE = "GIF8";
/** Where a PNG's IHDR chunk holds its width and height, big-endian. */
const PNG_WIDTH = 16;
const PNG_HEIGHT = 20;
/** Where a GIF's screen descriptor holds its width and height, little-endian. */
const GIF_WIDTH = 6;
const GIF_HEIGHT = 8;
const PNG_HEADER = 24;
const GIF_HEADER = 10;

/** Whether the bytes start with the signature. */
function startsWith(bytes: Uint8Array, signature: string): boolean {
  return String.fromCharCode(...bytes.subarray(0, signature.length)) === signature;
}

/** A PNG's or GIF's size, read from its header. Throws on anything else. */
export function imageSize(bytes: Uint8Array): ImageSize {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (startsWith(bytes, PNG_SIGNATURE) && bytes.length >= PNG_HEADER) {
    return { width: view.getUint32(PNG_WIDTH), height: view.getUint32(PNG_HEIGHT) };
  }
  if (startsWith(bytes, GIF_SIGNATURE) && bytes.length >= GIF_HEADER) {
    return { width: view.getUint16(GIF_WIDTH, true), height: view.getUint16(GIF_HEIGHT, true) };
  }
  throw new Error("Not a PNG or GIF image");
}
