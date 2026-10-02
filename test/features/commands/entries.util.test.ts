// import libraries
import { describe, expect, it } from "vitest";

// import utils
import {
  handEditedKeys,
  withBackground,
  withGlyph,
  withoutRepo,
} from "../../../src/features/commands/entries.util.ts";

// import types
import type { Hex } from "../../../src/shared/model/model.types.ts";

const RED = "#ff0000" as Hex;

describe("withBackground", () => {
  it("adds a string entry for a new repo", () => {
    expect(withBackground({ raw: undefined, repo: "webshop", background: RED })).toEqual({
      webshop: "#ff0000",
    });
  });

  it("keeps a string entry a string", () => {
    expect(
      withBackground({ raw: { webshop: "#000", other: "#111" }, repo: "webshop", background: RED }),
    ).toEqual({
      webshop: "#ff0000",
      other: "#111",
    });
  });

  it("keeps the other fields of an object entry", () => {
    const raw = { webshop: { background: "#000", foreground: "#fff", glyph: "heart", extra: 1 } };
    expect(withBackground({ raw, repo: "webshop", background: RED })).toEqual({
      webshop: { background: "#ff0000", foreground: "#fff", glyph: "heart", extra: 1 },
    });
  });

  it("replaces a malformed entry and ignores a malformed setting", () => {
    expect(withBackground({ raw: { webshop: 42 }, repo: "webshop", background: RED })).toEqual({
      webshop: "#ff0000",
    });
    expect(withBackground({ raw: "nope", repo: "webshop", background: RED })).toEqual({
      webshop: "#ff0000",
    });
  });

  it("doesn't mutate the input", () => {
    const raw = { webshop: { background: "#000" } };
    withBackground({ raw, repo: "webshop", background: RED });
    expect(raw).toEqual({ webshop: { background: "#000" } });
  });

  it("stores a repo named __proto__ as a real key", () => {
    const result = withBackground({ raw: { other: "#fff" }, repo: "__proto__", background: RED });
    expect(Object.hasOwn(result, "__proto__")).toBe(true);
    expect(Object.entries(result)).toEqual([
      ["other", "#fff"],
      ["__proto__", "#ff0000"],
    ]);
  });
});

describe("withGlyph", () => {
  it("turns a string entry into an object", () => {
    expect(withGlyph({ raw: { webshop: "#000" }, repo: "webshop", glyph: "star" })).toEqual({
      webshop: { background: "#000", glyph: "star" },
    });
  });

  it("keeps the other fields of an object entry", () => {
    expect(
      withGlyph({
        raw: { webshop: { background: "#000", border: "#111" } },
        repo: "webshop",
        glyph: "bar",
      }),
    ).toEqual({
      webshop: { background: "#000", border: "#111", glyph: "bar" },
    });
  });

  it("needs an existing entry", () => {
    expect(withGlyph({ raw: {}, repo: "webshop", glyph: "bar" })).toBeUndefined();
    expect(withGlyph({ raw: { webshop: 42 }, repo: "webshop", glyph: "bar" })).toBeUndefined();
  });
});

describe("withoutRepo", () => {
  it("removes only that repo", () => {
    expect(withoutRepo({ raw: { webshop: "#000", other: "#111" }, repo: "webshop" })).toEqual({
      other: "#111",
    });
  });

  it("removes the setting when it becomes empty", () => {
    expect(withoutRepo({ raw: { webshop: "#000" }, repo: "webshop" })).toBeUndefined();
    expect(withoutRepo({ raw: undefined, repo: "webshop" })).toBeUndefined();
  });
});

describe("handEditedKeys", () => {
  it("lists every field beyond the background", () => {
    const raw = { webshop: { background: "#000", glyph: "heart", foreground: "#fff" } };
    expect(handEditedKeys({ raw, repo: "webshop" })).toEqual(["glyph", "foreground"]);
  });

  it("is empty for a bare color or a background-only object", () => {
    expect(handEditedKeys({ raw: { webshop: "#000" }, repo: "webshop" })).toEqual([]);
    expect(handEditedKeys({ raw: { webshop: { background: "#000" } }, repo: "webshop" })).toEqual(
      [],
    );
  });

  it("ignores repos that aren't own entries", () => {
    // An inherited entry that would otherwise list "glyph".
    const raw: unknown = Object.create({ webshop: { background: "#000", glyph: "x" } });
    expect(handEditedKeys({ raw, repo: "webshop" })).toEqual([]);
    expect(handEditedKeys({ raw: undefined, repo: "webshop" })).toEqual([]);
  });
});
