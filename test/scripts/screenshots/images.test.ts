// import libraries
import { crc32 } from "node:zlib";
import { describe, expect, it } from "vitest";

// import utils
import {
  decodePng,
  encodeGif,
  encodePng,
  hasColor,
  sideBySide,
  stacked,
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

  it("copies exactly each image's rows when the heights are equal", () => {
    const left = { width: 1, height: 1, data: new Uint8Array(RED) };
    const right = { width: 1, height: 1, data: new Uint8Array(BLUE) };
    expect(sideBySide({ images: [left, right], gap: 0, background: GREY })).toEqual({
      width: 2,
      height: 1,
      data: new Uint8Array([...RED, ...BLUE]),
    });
  });

  it("adds no gap after a single image", () => {
    const one = { width: 1, height: 1, data: new Uint8Array(RED) };
    expect(sideBySide({ images: [one], gap: 5, background: GREY })).toEqual(one);
  });
});

describe("stacked", () => {
  it("puts the images in a column with the gap between, filling right of a narrower one", () => {
    const wide = { width: 2, height: 1, data: new Uint8Array([...RED, ...GREEN]) };
    const narrow = { width: 1, height: 2, data: new Uint8Array([...BLUE, ...RED]) };
    expect(stacked({ images: [wide, narrow], gap: 1, background: GREY })).toEqual({
      width: 2,
      height: 4,
      data: new Uint8Array([...RED, ...GREEN, ...GREY, ...GREY, ...BLUE, ...GREY, ...RED, ...GREY]),
    });
  });

  it("adds no gap after a single image", () => {
    const one = { width: 1, height: 1, data: new Uint8Array(RED) };
    expect(stacked({ images: [one], gap: 5, background: GREY })).toEqual(one);
  });
});

describe("hasColor", () => {
  const image = { width: 2, height: 1, data: new Uint8Array([...GREY, 250, 4, 6, 255]) };

  it("finds a pixel within the tolerance on every channel", () => {
    expect(hasColor({ image, color: RED, tolerance: 6 })).toBe(true);
  });

  it("misses when any channel is further off", () => {
    expect(hasColor({ image, color: RED, tolerance: 5 })).toBe(false);
    expect(hasColor({ image, color: BLUE, tolerance: 6 })).toBe(false);
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
  const frames = [
    { image: { width: 1, height: 1, data: new Uint8Array(RED) }, delayMs: 500 },
    { image: { width: 1, height: 1, data: new Uint8Array(BLUE) }, delayMs: 1200 },
  ];

  it("writes a GIF89a whose only extensions are frame timing and looping, no comments", () => {
    const bytes = encodeGif(frames);
    expect(new TextDecoder().decode(bytes.subarray(0, 6))).toBe("GIF89a");
    // 0xff application (the loop), then 0xf9 graphic control before each frame;
    // 0xfe would be a comment, which could carry text.
    expect(gifBlocks(bytes).map(({ kind }) => kind)).toEqual([
      "ext ff",
      "ext f9",
      "image",
      "ext f9",
      "image",
    ]);
  });

  it("keeps each frame's delay and color", () => {
    const blocks = gifBlocks(encodeGif(frames));
    // Graphic control: delay in hundredths of a second.
    expect(blocks.filter(({ kind }) => kind === "ext f9").map(({ delay }) => delay)).toEqual([
      50, 120,
    ]);
    expect(blocks.filter(({ kind }) => kind === "image").map(({ color }) => color)).toEqual([
      [255, 0, 0],
      [0, 0, 255],
    ]);
  });
});

interface GifBlock {
  kind: string;
  /** A graphic control's delay, in hundredths of a second. */
  delay?: number;
  /** A 1×1 image's pixel, from its color table and LZW data. */
  color?: number[];
}

/** A GIF's blocks after the header, in order. */
function gifBlocks(bytes: Uint8Array): GifBlock[] {
  const COLOR_TABLE = 0x80;
  const TABLE_SIZE = 0x07;
  const tableBytes = (flags: number) =>
    flags & COLOR_TABLE ? 3 * 2 ** ((flags & TABLE_SIZE) + 1) : 0;
  /** The data of a run of sub-blocks, each prefixed with its length, and where it ends. */
  const subBlocks = (from: number) => {
    const data: number[] = [];
    let at = from;
    while (bytes[at] !== 0) {
      const length = bytes[at] ?? 0;
      data.push(...bytes.subarray(at + 1, at + 1 + length));
      at += length + 1;
    }
    return { data, end: at + 1 };
  };
  const globalTable = 13;
  let table = bytes.subarray(globalTable, globalTable + tableBytes(bytes[10] ?? 0));
  const blocks: GifBlock[] = [];
  let at = globalTable + table.length;
  while (bytes[at] !== 0x3b) {
    if (bytes[at] === 0x21) {
      const label = bytes[at + 1] ?? 0;
      blocks.push({
        kind: `ext ${label.toString(16)}`,
        ...(label === 0xf9 ? { delay: (bytes[at + 4] ?? 0) | ((bytes[at + 5] ?? 0) << 8) } : {}),
      });
      at = subBlocks(at + 2).end;
    } else if (bytes[at] === 0x2c) {
      const flags = bytes[at + 9] ?? 0;
      if (flags & COLOR_TABLE) {
        table = bytes.subarray(at + 10, at + 10 + tableBytes(flags));
      }
      const codeSize = bytes[at + 10 + tableBytes(flags)] ?? 0;
      const { data, end } = subBlocks(at + 11 + tableBytes(flags));
      const index = firstLzwIndex({ data, codeSize });
      blocks.push({ kind: "image", color: [...table.subarray(index * 3, index * 3 + 3)] });
      at = end;
    } else {
      throw new Error(`Unexpected GIF block ${bytes[at]} at ${at}`);
    }
  }
  return blocks;
}

/** The first pixel's color index in GIF LZW data: the first code after the clear code. */
function firstLzwIndex({ data, codeSize }: { data: number[]; codeSize: number }): number {
  const width = codeSize + 1;
  const clear = 1 << codeSize;
  let bits = 0;
  let count = 0;
  const codes: number[] = [];
  for (const byte of data) {
    bits |= byte << count;
    count += 8;
    while (count >= width && codes.length < 2) {
      codes.push(bits & ((1 << width) - 1));
      bits >>= width;
      count -= width;
    }
  }
  const [first = 0, second = 0] = codes;
  return first === clear ? second : first;
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
