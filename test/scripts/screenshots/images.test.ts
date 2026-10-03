// import libraries
import { crc32 } from "node:zlib";
import { describe, expect, it } from "vitest";

// import utils
import {
  decodePng,
  encodeGif,
  encodePng,
  sideBySide,
} from "../../../scripts/screenshots/images.mts";

const RED = [255, 0, 0, 255] as const;
const BLUE = [0, 0, 255, 255] as const;
const GREY = [9, 9, 9, 255] as const;
const GREEN = [0, 255, 0, 255] as const;

describe("sideBySide", () => {
  it("puts the images in a row with the gap between, filling below a shorter one", () => {
    const tall = {
      width: 2,
      height: 2,
      data: new Uint8Array([...RED, ...GREEN, ...BLUE, ...RED]),
    };
    const short = { width: 1, height: 1, data: new Uint8Array(BLUE) };
    expect(sideBySide({ images: [tall, short], gap: 1, background: GREY })).toEqual({
      width: 4,
      height: 2,
      // Row one: the tall image's first row, the gap, the short image. Row two: its second row,
      // the gap, and fill below the short image.
      data: new Uint8Array([...RED, ...GREEN, ...GREY, ...BLUE, ...BLUE, ...RED, ...GREY, ...GREY]),
    });
  });

  it("adds no gap after a single image", () => {
    const one = { width: 1, height: 1, data: new Uint8Array(RED) };
    expect(sideBySide({ images: [one], gap: 5, background: GREY })).toEqual(one);
  });
});

describe("encodePng", () => {
  it("keeps the pixels and drops the text and EXIF chunks a capture carried", () => {
    const image = { width: 2, height: 1, data: new Uint8Array([...RED, ...BLUE]) };
    const captured = withChunks({
      png: encodePng(image),
      chunks: [
        chunk({ type: "tEXt", data: "Author\0someone" }),
        chunk({ type: "eXIf", data: "MM" }),
      ],
    });
    expect(chunkTypes(captured)).toEqual(["IHDR", "tEXt", "eXIf", "IDAT", "IEND"]);
    const bytes = encodePng(decodePng(captured));
    expect(decodePng(bytes)).toEqual(image);
    expect(chunkTypes(bytes)).toEqual(["IHDR", "IDAT", "IEND"]);
  });
});

describe("encodeGif", () => {
  it("writes a GIF89a whose only extensions are frame timing and looping, no comments", () => {
    const frame = { width: 1, height: 1, data: new Uint8Array(RED) };
    const bytes = encodeGif([
      { image: frame, delayMs: 500 },
      { image: { ...frame, data: new Uint8Array(BLUE) }, delayMs: 500 },
    ]);
    expect(new TextDecoder().decode(bytes.subarray(0, 6))).toBe("GIF89a");
    // 0xff application (the loop), then 0xf9 graphic control before each frame;
    // 0xfe would be a comment, which could carry text.
    expect(gifBlocks(bytes)).toEqual(["ext ff", "ext f9", "image", "ext f9", "image"]);
  });
});

/** A GIF's blocks after the header, in order: "ext <label>" or "image". */
function gifBlocks(bytes: Uint8Array): string[] {
  const COLOR_TABLE = 0x80;
  const TABLE_SIZE = 0x07;
  const tableBytes = (flags: number) =>
    flags & COLOR_TABLE ? 3 * 2 ** ((flags & TABLE_SIZE) + 1) : 0;
  /** Past a run of sub-blocks, each prefixed with its length, ending with a zero. */
  const skipSubBlocks = (from: number) => {
    let at = from;
    while (bytes[at] !== 0) {
      at += (bytes[at] ?? 0) + 1;
    }
    return at + 1;
  };
  const blocks: string[] = [];
  // Header (6), then the screen descriptor (7) with its global color table.
  let at = 13 + tableBytes(bytes[10] ?? 0);
  while (bytes[at] !== 0x3b) {
    if (bytes[at] === 0x21) {
      blocks.push(`ext ${(bytes[at + 1] ?? 0).toString(16)}`);
      at = skipSubBlocks(at + 2);
    } else if (bytes[at] === 0x2c) {
      blocks.push("image");
      // Descriptor (10) and local color table, then the LZW code size (1) and the data.
      at = skipSubBlocks(at + 10 + tableBytes(bytes[at + 9] ?? 0) + 1);
    } else {
      throw new Error(`Unexpected GIF block ${bytes[at]} at ${at}`);
    }
  }
  return blocks;
}

const SIGNATURE = 8;
/** Length (4) and type (4) before a chunk's data, CRC (4) after it. */
const HEAD = 8;
const CRC = 4;

/** The chunk types of a PNG, in order. */
function chunkTypes(bytes: Uint8Array): string[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const types: string[] = [];
  for (let at = SIGNATURE; at < bytes.length; at += HEAD + view.getUint32(at) + CRC) {
    types.push(new TextDecoder().decode(bytes.subarray(at + 4, at + HEAD)));
  }
  return types;
}

interface ChunkArgs {
  type: string;
  data: string;
}

/** A PNG chunk with a valid CRC, as a capture might carry it. */
function chunk({ type, data }: ChunkArgs): Uint8Array {
  const body = new TextEncoder().encode(type + data);
  const bytes = new Uint8Array(HEAD + body.length - 4 + CRC);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, body.length - 4);
  bytes.set(body, 4);
  view.setUint32(4 + body.length, crc32(body));
  return bytes;
}

interface WithChunksArgs {
  png: Uint8Array;
  chunks: readonly Uint8Array[];
}

/** The PNG with extra chunks right after its header chunk. */
function withChunks({ png, chunks }: WithChunksArgs): Uint8Array {
  const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
  const afterHeader = SIGNATURE + HEAD + view.getUint32(SIGNATURE) + CRC;
  return Buffer.concat([png.subarray(0, afterHeader), ...chunks, png.subarray(afterHeader)]);
}
