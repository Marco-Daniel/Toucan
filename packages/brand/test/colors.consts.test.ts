// import libraries
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// import consts
import { BRAND_COLORS } from "../src/colors.consts.ts";

const ICON = readFileSync(new URL("../assets/icon.svg", import.meta.url), "utf8");

describe("BRAND_COLORS", () => {
  it("are the icon's five colors", () => {
    expect(BRAND_COLORS).toEqual({
      plumageBlack: "#101316",
      cream: "#f6efdc",
      billAmber: "#faa404",
      beakOrange: "#e0620b",
      jungleGreen: "#56915e",
    });
  });

  it("are exactly the colors the icon draws with", () => {
    const drawn = new Set(ICON.match(/#[\da-f]{6}\b/gi)?.map((hex) => hex.toLowerCase()));
    expect([...drawn].toSorted()).toEqual(Object.values(BRAND_COLORS).toSorted());
  });
});
