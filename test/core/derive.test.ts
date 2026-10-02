import { converter, parseHex, wcagContrast } from "culori/fn";
import { describe, expect, it } from "vitest";
import { deriveColors } from "../../src/core/derive.ts";
import { COMMAND_CENTER_KEYS, type Hex } from "../../src/core/model.ts";

const toOklch = converter("oklch");
// Test inputs are written as valid hex, which the parser would produce.
const asHex = (value: string) => value as Hex;
const derive = (background: string, overrides: Record<string, string> = {}) =>
  deriveColors(asHex(background), overrides);
const lightness = (hex: string) => toOklch(parseHex(hex))!.l;

// Every preset from 0014, plus the extremes.
const BACKGROUNDS = [
  "#f92824",
  "#a3161a",
  "#e0620b",
  "#faa404",
  "#fde246",
  "#8a9c05",
  "#56915e",
  "#14939c",
  "#2c4a51",
  "#6241bd",
  "#b59ae0",
  "#70486c",
  "#e8579b",
  "#f5a3c7",
  "#a7a8b3",
  "#101316",
  "#000000",
  "#ffffff",
];

describe("deriveColors", () => {
  it.each([
    [
      "dark",
      "#2c4a51",
      {
        background: "#2c4a51",
        foreground: "#ffffff",
        activeBackground: "#3c5b62",
        activeForeground: "#ffffff",
        border: "#4d6c73",
        activeBorder: "#4d6c73",
        inactiveForeground: "#ffffff99",
        inactiveBorder: "#4d6c7380",
      },
    ],
    [
      "light",
      "#fde246",
      {
        background: "#fde246",
        foreground: "#000000",
        activeBackground: "#e9ce28",
        activeForeground: "#000000",
        border: "#d5bb00",
        activeBorder: "#d5bb00",
        inactiveForeground: "#00000099",
        inactiveBorder: "#d5bb0080",
      },
    ],
    [
      "saturated",
      "#f92824",
      {
        background: "#f92824",
        foreground: "#000000",
        activeBackground: "#e30003",
        activeForeground: "#000000",
        border: "#c90000",
        activeBorder: "#c90000",
        inactiveForeground: "#00000099",
        inactiveBorder: "#c9000080",
      },
    ],
  ])("derives the full set for a %s background", (_kind, background, expected) => {
    expect(derive(background)).toEqual(expected);
  });

  it.each(BACKGROUNDS)("derives a complete hex set for %s", (background) => {
    const colors = derive(background);
    expect(Object.keys(colors).toSorted()).toEqual([...COMMAND_CENTER_KEYS].toSorted());
    for (const value of Object.values(colors)) {
      expect(value).toMatch(/^#[0-9a-f]{6}([0-9a-f]{2})?$/);
    }
    expect(colors.background).toBe(background);
  });

  it("picks the foreground with the higher WCAG contrast", () => {
    expect(derive("#101316").foreground).toBe("#ffffff");
    expect(derive("#2c4a51").foreground).toBe("#ffffff");
    expect(derive("#fde246").foreground).toBe("#000000");
    expect(derive("#f5a3c7").foreground).toBe("#000000");
  });

  it("lightens the hover background and border on a dark background", () => {
    const colors = derive("#2c4a51");
    const bg = lightness("#2c4a51");
    expect(lightness(colors.activeBackground) - bg).toBeCloseTo(0.06, 2);
    expect(lightness(colors.border) - bg).toBeCloseTo(0.12, 2);
  });

  it("darkens the hover background and border on a light background", () => {
    const colors = derive("#fde246");
    const bg = lightness("#fde246");
    expect(bg - lightness(colors.activeBackground)).toBeCloseTo(0.06, 2);
    expect(bg - lightness(colors.border)).toBeCloseTo(0.12, 2);
  });

  it("shifts near-black backgrounds from a minimum lightness", () => {
    expect(derive("#000000")).toMatchObject({ activeBackground: "#242424", border: "#333333" });
    expect(lightness(derive("#ffffff").border)).toBeCloseTo(0.88, 2);
  });

  it("keeps hover and border visibly apart from every gray", () => {
    for (let value = 0; value < 256; value++) {
      const gray = `#${value.toString(16).padStart(2, "0").repeat(3)}`;
      const colors = derive(gray);
      expect(wcagContrast(gray, colors.activeBackground)).toBeGreaterThan(1.15);
      expect(wcagContrast(gray, colors.border)).toBeGreaterThan(1.4);
    }
  });

  it("reuses foreground and border for hover and fades them when inactive", () => {
    const colors = derive("#101316");
    expect(colors.activeForeground).toBe(colors.foreground);
    expect(colors.activeBorder).toBe(colors.border);
    expect(colors.inactiveForeground).toBe(`${colors.foreground}99`);
    expect(colors.inactiveBorder).toBe(`${colors.border}80`);
  });

  it("lets overrides win and builds derived colors on them", () => {
    const colors = derive("#101316", { foreground: "#ffcc00", border: "#336699" });
    expect(colors).toMatchObject({
      foreground: "#ffcc00",
      activeForeground: "#ffcc00",
      inactiveForeground: "#ffcc0099",
      border: "#336699",
      activeBorder: "#336699",
      inactiveBorder: "#33669980",
    });
  });

  it("keeps every explicit override as-is", () => {
    const overrides = {
      foreground: "#010203",
      activeBackground: "#040506",
      activeForeground: "#070809",
      border: "#0a0b0c",
      activeBorder: "#0d0e0f",
      inactiveForeground: "#10111280",
      inactiveBorder: "#13141540",
    };
    expect(derive("#ffffff", overrides)).toEqual({ background: "#ffffff", ...overrides });
  });

  it("multiplies the inactive alpha with a translucent override", () => {
    expect(derive("#000000", { foreground: "#ffffff80" }).inactiveForeground).toBe("#ffffff4d");
  });
});
