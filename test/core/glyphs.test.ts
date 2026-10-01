import { describe, expect, it } from "vitest";
import { escapeIcons, glyphIcon, glyphSvg, svgDataUri } from "../../src/core/glyphs.ts";
import { GLYPHS, type Hex } from "../../src/core/model.ts";

const RED = "#ff0000" as Hex;

describe("glyphIcon", () => {
  it.each([
    ["square", "$(toucan-square)"],
    ["bar", "$(toucan-bar)"],
    ["pill", "$(toucan-pill)"],
    ["circle", "$(circle-large-filled)"],
    ["double-circle", "$(record)"],
    ["heart", "$(heart-filled)"],
    ["star", "$(star-full)"],
    ["check-circle", "$(pass-filled)"],
  ] as const)("maps %s to %s", (glyph, icon) => {
    expect(glyphIcon(glyph)).toBe(icon);
  });
});

describe("glyphSvg", () => {
  it.each(GLYPHS)("draws %s as a standalone SVG in the given color", (glyph) => {
    const svg = glyphSvg(glyph, RED);
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" .*<\/svg>$/);
    expect(svg).toContain('fill="#ff0000"');
    expect(svg).toContain('height="16"');
    expect(svg).not.toContain("<script");
  });

  it("scales to the requested height and keeps the aspect ratio", () => {
    expect(glyphSvg("square", RED, 64)).toContain('width="64" height="64"');
    expect(glyphSvg("pill", RED, 32)).toContain('width="88" height="32"');
    expect(glyphSvg("bar", RED, 16)).toContain('width="6" height="16"');
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
