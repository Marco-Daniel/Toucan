// import libraries
import { converter, parseHex } from "culori/fn";
import { describe, expect, it } from "vitest";

// import utils
import {
  NEUTRAL_GRAY,
  fromHex,
  normalizeColor,
  validateColorInput,
} from "../../../src/shared/color/color.util.ts";

// import types
import type { Hex } from "../../../src/shared/model/model.types.ts";

const oklch = converter("oklch");

describe("NEUTRAL_GRAY", () => {
  it("is mid gray", () => {
    expect(NEUTRAL_GRAY).toBe("#808080");
  });
});

describe("normalizeColor", () => {
  it.each([
    ["#E91E63", "#e91e63"],
    ["#abc", "#aabbcc"],
    ["  #1b5e20  ", "#1b5e20"],
    ["rebeccapurple", "#663399"],
    ["rgb(255 0 0)", "#ff0000"],
    ["hsl(120deg 100% 25%)", "#008000"],
  ])("parses %s", (input, hex) => {
    expect(normalizeColor(input)).toBe(hex);
  });

  it.each([
    "hwb(200 10% 20%)",
    "lab(50% 40 30)",
    "lch(50% 40 30)",
    "oklab(0.6 0.1 0.05)",
    "oklch(0.7 0.1 200)",
    "color(display-p3 1 0 0)",
    "color(a98-rgb 1 0 0)",
    "color(prophoto-rgb 1 0 0)",
    "color(rec2020 1 0 0)",
    "color(srgb-linear 1 0 0)",
    "color(xyz-d65 0.4 0.2 0.1)",
    "color(xyz-d50 0.4 0.2 0.1)",
  ])("parses the CSS color space in %s", (input) => {
    expect(normalizeColor(input)).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("keeps alpha as 8-digit hex", () => {
    expect(normalizeColor("#ff000080")).toBe("#ff000080");
    expect(normalizeColor("rgb(0 0 255 / 50%)")).toBe("#0000ff80");
  });

  it.each(["#ff0000ff", "rgb(255 0 0 / 0.999)"])(
    "drops an alpha that rounds to ff in %s",
    (input) => {
      expect(normalizeColor(input)).toBe("#ff0000");
    },
  );

  it("maps out-of-gamut colors into sRGB without shifting the hue", () => {
    const mapped = normalizeColor("oklch(0.7 0.4 30)");
    // Clamping each channel would give pure #ff0000, a different hue.
    expect(mapped).toMatch(/^#[0-9a-f]{6}$/);
    expect(mapped).not.toBe("#ff0000");
    expect(oklch(parseHex(mapped!))?.h).toBeCloseTo(30, 0);
    expect(normalizeColor("oklch(0.7 0.4 30 / 0.5)")).toBe(`${mapped}80`);
  });

  it.each(["", "nope", "#ggg", "rgb(1, 2)"])("rejects %j", (input) => {
    expect(normalizeColor(input)).toBeUndefined();
  });
});

describe("validateColorInput", () => {
  it("accepts an opaque color as normalized hex", () => {
    expect(validateColorInput(" RebeccaPurple ")).toEqual({ kind: "color", hex: "#663399" });
  });

  it("treats blank input as nothing typed yet", () => {
    expect(validateColorInput("   ")).toEqual({ kind: "empty" });
  });

  it("rejects text that isn't a color", () => {
    expect(validateColorInput("nope")).toEqual({ kind: "invalid", message: "Not a color." });
  });

  it("rejects a translucent color, which can't be a background", () => {
    expect(validateColorInput("rgb(0 0 0 / 50%)")).toEqual({
      kind: "invalid",
      message: "Use an opaque color; the background can't be translucent.",
    });
  });
});

describe("fromHex", () => {
  it("throws on a value that isn't a color, rather than guessing one", () => {
    expect(() => fromHex("not a color" as Hex)).toThrow("Not a color: not a color");
  });
});
