// import libraries
import { describe, expect, it } from "vitest";

// import utils
import { presetDescription } from "../../../src/features/commands/presetItem.util.ts";

// import types
import type { Hex } from "../../../src/shared/model/model.types.ts";

describe("presetDescription", () => {
  it("is just the hex for a preset that's neither current nor hard to see", () => {
    expect(
      presetDescription({ hex: "#14939c" as Hex, isCurrent: false, isLowContrast: false }),
    ).toBe("#14939c");
  });

  it("puts the contrast warning on the same line, after the hex", () => {
    expect(
      presetDescription({ hex: "#a3161a" as Hex, isCurrent: false, isLowContrast: true }),
    ).toBe("#a3161a · $(warning) hard to see on the status bar");
  });

  it("marks the current preset before the warning", () => {
    expect(presetDescription({ hex: "#a3161a" as Hex, isCurrent: true, isLowContrast: true })).toBe(
      "#a3161a · current · $(warning) hard to see on the status bar",
    );
    expect(
      presetDescription({ hex: "#e8579b" as Hex, isCurrent: true, isLowContrast: false }),
    ).toBe("#e8579b · current");
  });
});
