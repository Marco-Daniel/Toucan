// import libraries
import { describe, expect, it } from "vitest";

// import utils
import { roundToHundredths } from "../../../src/shared/math/round.util.ts";

describe("roundToHundredths", () => {
  it.each([
    [1.234, 1.23],
    [1.235, 1.24],
    [-0.006, -0.01],
    [8, 8],
  ])("rounds %d to %d", (value, rounded) => {
    expect(roundToHundredths(value)).toBe(rounded);
  });
});
