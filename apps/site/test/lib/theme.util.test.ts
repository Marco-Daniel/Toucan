// import libraries
import { describe, expect, it } from "vitest";

// import utils
import { brandCssVariables } from "../../app/lib/theme.util.ts";

// import consts
import { BRAND_COLORS } from "@toucan/brand/colors.consts.ts";

describe("brandCssVariables", () => {
  it("names each brand color --brand-<kebab-case name> on :root", () => {
    expect(brandCssVariables(BRAND_COLORS)).toBe(
      ":root{--brand-plumage-black:#101316;--brand-cream:#f6efdc;--brand-bill-amber:#faa404;--brand-beak-orange:#e0620b;--brand-jungle-green:#56915e;}",
    );
  });
});
