import { describe, expect, it } from "vitest";
import { asHex, isHex } from "../../src/core/model.ts";

describe("isHex", () => {
  it.each(["#e0620b", "#e0620b80"])("accepts %s, the form toHex produces", (value) => {
    expect(isHex(value)).toBe(true);
  });

  it.each(["#E0620B", "#e0620", "#e0620b8", "e0620b", "#e0620g", " #e0620b", "#e0620b\n"])(
    "rejects %j",
    (value) => {
      expect(isHex(value)).toBe(false);
    },
  );
});

describe("asHex", () => {
  it("returns a valid color unchanged", () => {
    expect(asHex("#181818")).toBe("#181818");
  });

  it("throws on a typo, so a bad constant fails at load", () => {
    expect(() => asHex("#18181")).toThrow("Not a lowercase #rrggbb or #rrggbbaa color: #18181");
  });
});
