import { describe, expect, it } from "vitest";
import { handEditedKeys, withBackground, withGlyph, withoutRepo } from "../../src/core/entries.ts";
import type { Hex } from "../../src/core/model.ts";
import { PRESETS } from "../../src/core/presets.ts";
import { normalizeColor } from "../../src/core/color.ts";

const RED = "#ff0000" as Hex;

describe("withBackground", () => {
  it("adds a string entry for a new repo", () => {
    expect(withBackground(undefined, "webshop", RED)).toEqual({ webshop: "#ff0000" });
  });

  it("keeps a string entry a string", () => {
    expect(withBackground({ webshop: "#000", other: "#111" }, "webshop", RED)).toEqual({
      webshop: "#ff0000",
      other: "#111",
    });
  });

  it("keeps the other fields of an object entry", () => {
    const raw = { webshop: { background: "#000", foreground: "#fff", glyph: "heart", extra: 1 } };
    expect(withBackground(raw, "webshop", RED)).toEqual({
      webshop: { background: "#ff0000", foreground: "#fff", glyph: "heart", extra: 1 },
    });
  });

  it("replaces a malformed entry and ignores a malformed setting", () => {
    expect(withBackground({ webshop: 42 }, "webshop", RED)).toEqual({ webshop: "#ff0000" });
    expect(withBackground("nope", "webshop", RED)).toEqual({ webshop: "#ff0000" });
  });

  it("doesn't mutate the input", () => {
    const raw = { webshop: { background: "#000" } };
    withBackground(raw, "webshop", RED);
    expect(raw).toEqual({ webshop: { background: "#000" } });
  });

  it("stores a repo named __proto__ as a real key", () => {
    const result = withBackground({ other: "#fff" }, "__proto__", RED);
    expect(Object.hasOwn(result, "__proto__")).toBe(true);
    expect(Object.entries(result)).toEqual([
      ["other", "#fff"],
      ["__proto__", "#ff0000"],
    ]);
  });
});

describe("withGlyph", () => {
  it("turns a string entry into an object", () => {
    expect(withGlyph({ webshop: "#000" }, "webshop", "star")).toEqual({
      webshop: { background: "#000", glyph: "star" },
    });
  });

  it("keeps the other fields of an object entry", () => {
    expect(
      withGlyph({ webshop: { background: "#000", border: "#111" } }, "webshop", "bar"),
    ).toEqual({
      webshop: { background: "#000", border: "#111", glyph: "bar" },
    });
  });

  it("needs an existing entry", () => {
    expect(withGlyph({}, "webshop", "bar")).toBeUndefined();
    expect(withGlyph({ webshop: 42 }, "webshop", "bar")).toBeUndefined();
  });
});

describe("withoutRepo", () => {
  it("removes only that repo", () => {
    expect(withoutRepo({ webshop: "#000", other: "#111" }, "webshop")).toEqual({ other: "#111" });
  });

  it("removes the setting when it becomes empty", () => {
    expect(withoutRepo({ webshop: "#000" }, "webshop")).toBeUndefined();
    expect(withoutRepo(undefined, "webshop")).toBeUndefined();
  });
});

describe("PRESETS", () => {
  it("has the 16 colors from 0014 as normalized hex", () => {
    expect(PRESETS).toHaveLength(16);
    for (const { hex } of PRESETS) {
      expect(normalizeColor(hex)).toBe(hex);
    }
    expect(new Set(PRESETS.map(({ name }) => name)).size).toBe(16);
  });
});

describe("handEditedKeys", () => {
  it("lists every field beyond the background", () => {
    const raw = { webshop: { background: "#000", glyph: "heart", foreground: "#fff" } };
    expect(handEditedKeys(raw, "webshop")).toEqual(["glyph", "foreground"]);
  });

  it("is empty for a bare color or a background-only object", () => {
    expect(handEditedKeys({ webshop: "#000" }, "webshop")).toEqual([]);
    expect(handEditedKeys({ webshop: { background: "#000" } }, "webshop")).toEqual([]);
  });

  it("ignores repos that aren't own entries", () => {
    expect(handEditedKeys({}, "constructor")).toEqual([]);
    expect(handEditedKeys(undefined, "webshop")).toEqual([]);
  });
});
