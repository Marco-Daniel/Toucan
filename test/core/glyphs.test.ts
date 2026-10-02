import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";
import {
  FONT_CODEPOINTS,
  escapeIcons,
  glyphIcon,
  QUICK_PICK_SEPARATOR,
  glyphPickItems,
  glyphSvg,
  svgDataUri,
} from "../../src/core/glyphs.ts";
import { GLYPH_PATHS } from "../../src/generated/glyphPaths.ts";
import { GLYPH_GROUPS, GLYPHS, type Glyph, type Hex } from "../../src/core/model.ts";

const RED = "#ff0000" as Hex;

describe("glyphIcon", () => {
  it.each([
    ["square", "$(toucan-square)"],
    ["toucan", "$(toucan-toucan)"],
    ["rocket", "$(toucan-rocket)"],
  ] as const)("maps %s to Toucan's own font icon %s", (glyph, icon) => {
    expect(glyphIcon(glyph)).toBe(icon);
  });
});

describe("FONT_CODEPOINTS", () => {
  it("keeps pill, square and bar where they were and appends the rest in group order", () => {
    expect(
      Object.entries(FONT_CODEPOINTS)
        .toSorted(([, a], [, b]) => a - b)
        .map(([glyph, codepoint]) => `${codepoint.toString(16)} ${glyph}`),
    ).toEqual([
      "e000 pill",
      "e001 square",
      "e002 bar",
      "e003 circle",
      "e004 toucan",
      "e005 sun",
      "e006 leaf",
      "e007 drop",
      "e008 moon",
      "e009 alien",
      "e00a ghost",
      "e00b robot",
      "e00c cat",
      "e00d bolt",
      "e00e heart",
      "e00f star",
      "e010 rocket",
    ]);
  });
});

describe("glyph groups", () => {
  it("are the four themed groups, covering GLYPHS in order", () => {
    expect(GLYPH_GROUPS.map(({ label, glyphs }) => `${label}: ${glyphs.join(" ")}`)).toEqual([
      "Shapes: square bar pill circle",
      "Toucan's world: toucan sun leaf drop moon",
      "Characters: alien ghost robot cat",
      "Fun & dev: bolt heart star rocket",
    ]);
    expect(GLYPH_GROUPS.flatMap(({ glyphs }) => glyphs)).toEqual([...GLYPHS]);
  });

  it("give Set Glyph a separator per group, then its glyphs with swatches, the current one marked", () => {
    const items = glyphPickItems("sun", (glyph) => `swatch:${glyph}`);
    expect(items.slice(0, 7)).toEqual([
      { label: "Shapes", kind: -1 },
      { label: "square", glyph: "square", iconPath: "swatch:square" },
      { label: "bar", glyph: "bar", iconPath: "swatch:bar" },
      { label: "pill", glyph: "pill", iconPath: "swatch:pill" },
      { label: "circle", glyph: "circle", iconPath: "swatch:circle" },
      { label: "Toucan's world", kind: -1 },
      { label: "toucan", glyph: "toucan", iconPath: "swatch:toucan" },
    ]);
    expect(items[7]).toEqual({
      label: "sun",
      glyph: "sun",
      iconPath: "swatch:sun",
      description: "current",
    });
    expect(
      items.map((item) =>
        item.kind === -1 ? `-- ${item.label}` : `${item.label}${item.description ? " *" : ""}`,
      ),
    ).toEqual([
      "-- Shapes",
      "square",
      "bar",
      "pill",
      "circle",
      "-- Toucan's world",
      "toucan",
      "sun *",
      "leaf",
      "drop",
      "moon",
      "-- Characters",
      "alien",
      "ghost",
      "robot",
      "cat",
      "-- Fun & dev",
      "bolt",
      "heart",
      "star",
      "rocket",
    ]);
  });

  it("use VS Code's separator kind", () => {
    // Core can't import vscode, so pin the value against its API types.
    const api = readFileSync(
      new URL("../../node_modules/@types/vscode/index.d.ts", import.meta.url),
      "utf8",
    );
    const kinds = /export enum QuickPickItemKind \{([\s\S]*?)\n\t\}/.exec(api)?.[1] ?? "";
    expect(/Separator = (-?\d+)/.exec(kinds)?.[1]).toBe(String(QUICK_PICK_SEPARATOR));
  });
});

describe("glyphSvg", () => {
  it.each(GLYPHS)("draws %s as one plain filled path, nothing a font would drop", (glyph) => {
    const svg = glyphSvg(glyph, RED);
    expect(svg).toMatch(
      /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="[\d.]+" height="16" viewBox="0 0 [\d.]+ 16" fill="#ff0000"><path d="M[^"]+Z"\/><\/svg>$/,
    );
    expect(svg).not.toMatch(/stroke|mask|fill-rule|evenodd|<rect|<circle|<polygon/);
  });

  it("keeps each glyph's width: 18 for the toucan, 6 for bar, 44 for pill, 16 for the rest", () => {
    const widths = Object.fromEntries(
      GLYPHS.map((glyph) => [glyph, /viewBox="0 0 ([\d.]+) 16"/.exec(glyphSvg(glyph, RED))?.[1]]),
    );
    expect(widths).toEqual({
      ...Object.fromEntries(GLYPHS.map((glyph) => [glyph, "16"])),
      toucan: "18",
      bar: "6",
      pill: "44",
    });
  });

  it("scales to the requested height and keeps the aspect ratio", () => {
    expect(glyphSvg("square", RED, 64)).toContain('width="64" height="64"');
    expect(glyphSvg("pill", RED, 32)).toContain('width="88" height="32"');
    expect(glyphSvg("toucan", RED, 32)).toContain('width="36" height="32"');
  });
});

/** Alpha at glyph coordinate (x, y) of the glyph rendered 10 px per unit. */
function inkAt(glyph: Glyph): (x: number, y: number) => number {
  const scale = 10;
  // `pixels` copies the whole buffer on every access: read it once.
  const { pixels, width } = new Resvg(glyphSvg(glyph, RED, 16 * scale)).render();
  return (x, y) => pixels[(Math.floor(y * scale) * width + Math.floor(x * scale)) * 4 + 3]!;
}

describe("glyph bounds", () => {
  // glyphSvg's viewBox is the glyph box: anything outside it would be clipped
  // in swatches but drawn in full by the font.
  it("keep every baked outline inside its box", () => {
    const outside = GLYPHS.filter((glyph) => {
      const { width, d } = GLYPH_PATHS[glyph];
      const numbers = d.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
      const xs = numbers.filter((_, i) => i % 2 === 0);
      const ys = numbers.filter((_, i) => i % 2 === 1);
      return (
        Math.min(...xs) < 0 ||
        Math.max(...xs) > width ||
        Math.min(...ys) < 0 ||
        Math.max(...ys) > 16
      );
    });
    expect(outside).toEqual([]);
  });
});

describe("glyph shapes", () => {
  // Points from the reference sheet's geometry: inside a body must be ink;
  // inside a hole, between rays or past a softened corner must be clear.
  it.each([
    [
      "square",
      [
        [8, 8],
        [1.2, 0.6],
      ],
      [
        [0.5, 0.5],
        [15.5, 15.5],
      ],
    ],
    [
      "pill",
      [[22, 8]],
      [
        [0.6, 0.6],
        [43.4, 15.4],
      ],
    ],
    ["circle", [[8, 8]], [[1.5, 1.5]]],
    [
      "toucan",
      [
        [5, 9],
        [12, 3],
      ],
      [
        [5.2, 3.6],
        [7.6, 3.2],
      ],
    ],
    [
      "sun",
      [
        [8, 8],
        [8, 1.5],
      ],
      [
        [8, 3.9],
        [10.5, 2.2],
      ],
    ],
    [
      "moon",
      [[4, 10]],
      [
        [11.4, 5.4],
        [14.6, 2],
      ],
    ],
    [
      "leaf",
      [
        [9, 7],
        [2.3, 13.7],
      ],
      [
        [1.2, 12],
        [5, 14.6],
        [14.8, 14.8],
        [2, 2],
        [12, 12],
      ],
    ],
    [
      "drop",
      [
        [8, 11],
        [8, 3],
      ],
      [
        [3, 3],
        [13, 3],
      ],
    ],
    [
      "alien",
      [[8, 12]],
      [
        [5.5, 8.6],
        [10.5, 8.6],
      ],
    ],
    [
      "ghost",
      [[8, 4]],
      [
        [5.9, 7.8],
        [10.1, 7.8],
      ],
    ],
    [
      "robot",
      [
        [3, 13],
        [8, 2],
      ],
      [
        [5.5, 8.3],
        [10.5, 8.3],
        [8, 11.9],
      ],
    ],
    [
      "cat",
      [[8, 13]],
      [
        [5.45, 9],
        [10.55, 9],
      ],
    ],
    ["heart", [[8, 8]], [[8, 2.4]]],
    ["rocket", [[8, 11]], [[8, 6.6]]],
    [
      "bar",
      [
        [3, 8],
        [3, 0.5],
        [3, 15.5],
      ],
      [
        [0.3, 0.3],
        [5.8, 8],
      ],
    ],
    [
      "bolt",
      [
        [6, 7.5],
        [8, 4],
        [8, 10],
      ],
      [
        [2, 2],
        [14, 14],
        [3, 13],
        [11.5, 3],
      ],
    ],
    [
      "star",
      [
        [8, 8.6],
        [8, 2],
        [2, 6.4],
      ],
      [
        [3, 3],
        [8, 15],
        [13, 3],
      ],
    ],
  ] as const)("draws %s with its holes and gaps open", (glyph, ink, clear) => {
    const at = inkAt(glyph);
    expect(ink.map(([x, y]) => at(x, y))).toEqual(ink.map(() => 255));
    expect(clear.map(([x, y]) => at(x, y))).toEqual(clear.map(() => 0));
  });
});

describe("svgDataUri", () => {
  it("base64-encodes the SVG", () => {
    const svg = glyphSvg("heart", RED);
    const uri = svgDataUri(svg);
    expect(uri.startsWith("data:image/svg+xml;base64,")).toBe(true);
    expect(Buffer.from(uri.split(",")[1] ?? "", "base64").toString("utf8")).toBe(svg);
  });
});

describe("escapeIcons", () => {
  it("escapes every icon reference", () => {
    expect(escapeIcons("$(rocket)-app $(x)")).toBe("\\$(rocket)-app \\$(x)");
  });

  it("leaves other text alone", () => {
    expect(escapeIcons("my-repo $ (a)")).toBe("my-repo $ (a)");
  });
});
