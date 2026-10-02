import { describe, expect, it } from "vitest";
import {
  handEditedKeys,
  withBackground,
  withGlyph,
  withoutRepo,
} from "../../../src/features/commands/entries.util.ts";
import type { Hex } from "../../../src/shared/model/model.types.ts";

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
    // An inherited entry that would otherwise list "glyph".
    const raw: unknown = Object.create({ webshop: { background: "#000", glyph: "x" } });
    expect(handEditedKeys(raw, "webshop")).toEqual([]);
    expect(handEditedKeys(undefined, "webshop")).toEqual([]);
  });
});
