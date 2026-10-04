// import libraries
import { describe, expect, it } from "vitest";

// import utils
import { brandCssVariables, presetCssClasses } from "../../app/lib/theme.util.ts";

// import consts
import { BRAND_COLORS } from "@toucan/brand/colors.consts.ts";

describe("brandCssVariables", () => {
  it("names each brand color --brand-<kebab-case name> on :root", () => {
    expect(brandCssVariables(BRAND_COLORS)).toBe(
      ":root{--brand-plumage-black:#101316;--brand-cream:#f6efdc;--brand-bill-amber:#faa404;--brand-beak-orange:#e0620b;--brand-jungle-green:#56915e;}",
    );
  });
});

describe("presetCssClasses", () => {
  it("gives each preset a class that sets --preset to its color", () => {
    expect(
      presetCssClasses([
        { name: "Beak Red", hex: "#f92824" },
        { name: "Plumage Black", hex: "#101316" },
      ]),
    ).toBe(".preset-beak-red{--preset:#f92824;}.preset-plumage-black{--preset:#101316;}");
  });
});
