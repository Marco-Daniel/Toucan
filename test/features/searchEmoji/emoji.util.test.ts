import { describe, expect, it } from "vitest";
import { emojiColor, emojiFor } from "../../../src/features/searchEmoji/emoji.util.ts";
import { GLYPHS } from "../../../src/shared/model/model.consts.ts";
import { asHex } from "../../../src/shared/color/hex.util.ts";

describe("emojiColor", () => {
  // The toucan-v1/0014 presets, plus a few common colors that are hard to classify.
  it.each([
    ["#f92824", "red"],
    ["#a3161a", "red"],
    ["#e0620b", "orange"],
    ["#faa404", "orange"],
    ["#fde246", "yellow"],
    ["#8a9c05", "green"],
    ["#56915e", "green"],
    ["#14939c", "blue"],
    ["#2c4a51", "black"],
    ["#6241bd", "purple"],
    ["#b59ae0", "purple"],
    ["#70486c", "purple"],
    ["#e8579b", "red"],
    ["#f5a3c7", "red"],
    ["#a7a8b3", "white"],
    ["#101316", "black"],
    ["#1b5e20", "green"],
    ["#0d2a6b", "blue"],
    ["#795548", "brown"],
    ["#8b5a2b", "brown"],
    ["#000000", "black"],
    ["#ffffff", "white"],
    ["#8c8c8c", "white"],
    ["#6e6e6e", "black"],
  ])("classifies %s as %s", (color, expected) => {
    expect(emojiColor(asHex(color))).toBe(expected);
  });
});

describe("emojiFor", () => {
  it("uses the glyph's shape where an emoji exists", () => {
    expect(emojiFor({ hex: asHex("#f92824"), glyph: "square" })).toBe("🟥");
    expect(emojiFor({ hex: asHex("#f92824"), glyph: "circle" })).toBe("🔴");
    expect(emojiFor({ hex: asHex("#f92824"), glyph: "heart" })).toBe("❤️");
  });

  it("uses squares for star, so the color survives", () => {
    expect(emojiFor({ hex: asHex("#f92824"), glyph: "star" })).toBe("🟥");
    expect(emojiFor({ hex: asHex("#14939c"), glyph: "star" })).toBe("🟦");
  });

  it("uses circles for circle, hearts for heart and squares for every other glyph", () => {
    expect(
      Object.fromEntries(
        GLYPHS.map((glyph) => [glyph, emojiFor({ hex: asHex("#14939c"), glyph })]),
      ),
    ).toEqual({
      square: "🟦",
      bar: "🟦",
      pill: "🟦",
      circle: "🔵",
      toucan: "🟦",
      sun: "🟦",
      leaf: "🟦",
      drop: "🟦",
      moon: "🟦",
      alien: "🟦",
      ghost: "🟦",
      robot: "🟦",
      cat: "🟦",
      bolt: "🟦",
      heart: "💙",
      star: "🟦",
      rocket: "🟦",
    });
  });

  // One color per category, in EMOJI_COLORS order.
  const CATEGORIES = [
    "#f92824",
    "#e0620b",
    "#fde246",
    "#56915e",
    "#14939c",
    "#6241bd",
    "#795548",
    "#000000",
    "#ffffff",
  ];

  it.each([
    ["square", "🟥 🟧 🟨 🟩 🟦 🟪 🟫 ⬛ ⬜"],
    ["circle", "🔴 🟠 🟡 🟢 🔵 🟣 🟤 ⚫ ⚪"],
    ["heart", "❤️ 🧡 💛 💚 💙 💜 🤎 🖤 🤍"],
  ] as const)("has the full %s row", (glyph, row) => {
    expect(CATEGORIES.map((color) => emojiFor({ hex: asHex(color), glyph })).join(" ")).toBe(row);
  });

  it.each(GLYPHS)("returns a single emoji for every color category with %s", (glyph) => {
    for (const color of ["#f92824", "#e0620b", "#fde246", "#56915e", "#14939c", "#6241bd"]) {
      expect([
        ...new Intl.Segmenter().segment(emojiFor({ hex: asHex(color), glyph })),
      ]).toHaveLength(1);
    }
    for (const color of ["#795548", "#000000", "#ffffff"]) {
      expect([
        ...new Intl.Segmenter().segment(emojiFor({ hex: asHex(color), glyph })),
      ]).toHaveLength(1);
    }
  });
});
