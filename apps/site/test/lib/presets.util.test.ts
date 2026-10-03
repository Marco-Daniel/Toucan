// import libraries
import { describe, expect, it } from "vitest";

// import utils
import { presetHex } from "../../app/lib/presets.util.ts";

describe("presetHex", () => {
  it("finds a preset's hex by its name", () => {
    expect(presetHex("Canopy Teal")).toBe("#14939c");
    expect(presetHex("Plumage Black")).toBe("#101316");
  });

  it("throws on a name the brand doesn't have, so a renamed preset fails the build", () => {
    expect(() => presetHex("Canopy Blue")).toThrow("No preset named Canopy Blue");
  });
});
