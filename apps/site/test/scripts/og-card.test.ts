// import libraries
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// import utils
import { ogCardSvg } from "../../scripts/og-card.mts";

// import consts
import { BRAND_COLORS } from "@toucan/brand/colors.consts.ts";

const ICON = readFileSync(
  new URL("../../../../packages/brand/assets/icon.svg", import.meta.url),
  "utf8",
);
const TEMPLATE = readFileSync(new URL("../../assets/og-card.svg", import.meta.url), "utf8");

describe("ogCardSvg", () => {
  it("fills the brand colors and places the scene on the right", () => {
    expect(
      ogCardSvg({
        template: '<svg><rect fill="{jungleGreen}"/><g data-scene=""/><path fill="{cream}"/></svg>',
        iconSvg: ICON,
        colors: BRAND_COLORS,
      }),
    ).toMatch(
      /^<svg><rect fill="#56915e"\/><svg x="650" y="40" width="520" height="520" viewBox="0 0 128 128"><clipPath id="sky">.*<\/svg><path fill="#f6efdc"\/><\/svg>$/,
    );
  });

  it("leaves no token and no slot in the real card, and draws no text that needs a font", () => {
    const card = ogCardSvg({ template: TEMPLATE, iconSvg: ICON, colors: BRAND_COLORS });
    expect(card).not.toMatch(/\{\w+\}|data-scene|<text\b/);
    expect(
      card.startsWith(
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">',
      ),
    ).toBe(true);
  });

  it("throws on a color the brand doesn't have, or a template without the scene slot", () => {
    expect(() =>
      ogCardSvg({
        template: '<g data-scene=""/><path fill="{teal}"/>',
        iconSvg: ICON,
        colors: BRAND_COLORS,
      }),
    ).toThrow("unknown brand color: teal");
    expect(() => ogCardSvg({ template: "<svg/>", iconSvg: ICON, colors: BRAND_COLORS })).toThrow(
      "The card template has no scene slot",
    );
  });
});
