import { describe, expect, it } from "vitest";
import { isOneOf } from "../../../src/shared/guards/oneOf.util.ts";

const MODES = ["always", "unfocused"] as const;

describe("isOneOf", () => {
  it("accepts a listed value", () => {
    expect(isOneOf(MODES, "unfocused")).toBe(true);
  });

  it.each([["never"], ["Always"], [""], [1], [undefined], [null]])("rejects %j", (value) => {
    expect(isOneOf(MODES, value)).toBe(false);
  });
});
