// import libraries
import { describe, expect, it } from "vitest";

// import utils
import { around, rgb } from "../../../scripts/screenshots/geometry.mts";

describe("around", () => {
  const bounds = { width: 100, height: 50 };

  it("spans every box, with the margin on each side", () => {
    expect(
      around({
        boxes: [
          { x: 20, y: 30, width: 10, height: 5 },
          { x: 40, y: 10, width: 5, height: 5 },
        ],
        margin: 3,
        bounds,
      }),
    ).toEqual({ x: 17, y: 7, width: 31, height: 31 });
  });

  it("stays inside the window", () => {
    expect(around({ boxes: [{ x: 1, y: 40, width: 98, height: 9 }], margin: 4, bounds })).toEqual({
      x: 0,
      y: 36,
      width: 100,
      height: 14,
    });
  });
});

describe("rgb", () => {
  it("writes a hex color as the page reports it", () => {
    expect(rgb("#e8579B")).toBe("rgb(232, 87, 155)");
  });

  it("rejects anything but exactly #rrggbb", () => {
    expect(() => rgb("#e85")).toThrow("Not a #rrggbb color: #e85");
    expect(() => rgb("#e8579b00")).toThrow("Not a #rrggbb color: #e8579b00");
    expect(() => rgb("x#e8579b")).toThrow("Not a #rrggbb color: x#e8579b");
  });
});
