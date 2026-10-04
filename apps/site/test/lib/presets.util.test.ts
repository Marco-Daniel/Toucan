// import libraries
import { describe, expect, it } from "vitest";

// import utils
import { presetClass, presetSlug } from "../../app/lib/presets.util.ts";

describe("presetSlug", () => {
  it.each([
    ["Beak Red", "beak-red"],
    ["Plumage Black", "plumage-black"],
    ["Fun & dev", "fun-dev"],
  ])("%j → %j", (name, slug) => {
    expect(presetSlug(name)).toBe(slug);
  });
});

describe("presetClass", () => {
  it("names a preset's color class", () => {
    expect(presetClass("Canopy Teal")).toBe("preset-canopy-teal");
  });

  it("throws on a name the brand doesn't have, so a renamed preset fails the build", () => {
    expect(() => presetClass("Canopy Blue")).toThrow("No preset named Canopy Blue");
  });
});
