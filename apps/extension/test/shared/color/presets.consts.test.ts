// import libraries
import { describe, expect, it } from "vitest";

// import consts
import { PRESETS } from "../../../src/shared/color/presets.consts.ts";

describe("PRESETS", () => {
  it("are the 16 colors from toucan-v1/0014, in order", () => {
    expect(PRESETS).toEqual([
      { name: "Beak Red", hex: "#f92824" },
      { name: "Berry Red", hex: "#a3161a" },
      { name: "Beak Orange", hex: "#e0620b" },
      { name: "Bill Amber", hex: "#faa404" },
      { name: "Beak Yellow", hex: "#fde246" },
      { name: "Bill Lime", hex: "#8a9c05" },
      { name: "Jungle Green", hex: "#56915e" },
      { name: "Canopy Teal", hex: "#14939c" },
      { name: "Slate Blue", hex: "#2c4a51" },
      { name: "Orchid Purple", hex: "#6241bd" },
      { name: "Lilac", hex: "#b59ae0" },
      { name: "Plum", hex: "#70486c" },
      { name: "Tropical Pink", hex: "#e8579b" },
      { name: "Blossom Pink", hex: "#f5a3c7" },
      { name: "Silver", hex: "#a7a8b3" },
      { name: "Plumage Black", hex: "#101316" },
    ]);
  });
});
