// import libraries
import { describe, expect, it } from "vitest";

// import consts
import { BRAND_PRESETS } from "../src/presets.consts.ts";

// The extension's PRESETS test pins the palette itself; this checks the form
// both products rely on.
describe("BRAND_PRESETS", () => {
  it("are lowercase #rrggbb colors, each name and color once", () => {
    expect(BRAND_PRESETS.filter(({ hex }) => !/^#[\da-f]{6}$/.test(hex))).toEqual([]);
    expect(new Set(BRAND_PRESETS.map(({ name }) => name)).size).toBe(16);
    expect(new Set(BRAND_PRESETS.map(({ hex }) => hex)).size).toBe(16);
    expect(BRAND_PRESETS).toHaveLength(16);
  });
});
