import { describe, expect, it } from "vitest";
import { parseRepos } from "../../src/core/config.ts";

describe("parseRepos", () => {
  it("returns nothing for an unset value", () => {
    expect(parseRepos(undefined)).toEqual({ repos: new Map(), issues: [] });
    expect(parseRepos(null)).toEqual({ repos: new Map(), issues: [] });
  });

  it.each([[[]], ["#fff"], [42]])("reports a malformed setting %j", (raw) => {
    const { repos, issues } = parseRepos(raw);
    expect(repos.size).toBe(0);
    expect(issues).toHaveLength(1);
    expect(issues[0]?.repo).toBeUndefined();
  });

  it("reads a string as the background with the default glyph", () => {
    const { repos, issues } = parseRepos({ webshop: "#E91E63" });
    expect(issues).toEqual([]);
    expect(repos.get("webshop")).toEqual({ background: "#e91e63", overrides: {}, glyph: "square" });
  });

  it("reads a full object entry", () => {
    const { repos, issues } = parseRepos({
      toucan: {
        background: "#1b5e20",
        foreground: "white",
        border: "#2e7d32",
        inactiveBorder: "#2e7d3280",
        glyph: "heart",
        sidebarBlock: "unfocused",
      },
    });
    expect(issues).toEqual([]);
    expect(repos.get("toucan")).toEqual({
      background: "#1b5e20",
      overrides: { foreground: "#ffffff", border: "#2e7d32", inactiveBorder: "#2e7d3280" },
      glyph: "heart",
      sidebarBlock: "unfocused",
    });
  });

  it.each([
    ["#ff000080", "#ff0000"],
    ["rgb(0 0 255 / 0.3)", "#0000ff"],
  ])("makes the translucent background %s opaque and reports it", (input, hex) => {
    for (const raw of [{ r: input }, { r: { background: input } }]) {
      const { repos, issues } = parseRepos(raw);
      expect(repos.get("r")?.background).toBe(hex);
      expect(issues).toEqual([{ repo: "r", message: expect.stringContaining("alpha is ignored") }]);
    }
  });

  it.each(["transparent", "#ff000000"])("drops the fully transparent background %s", (input) => {
    for (const raw of [{ r: input }, { r: { background: input } }]) {
      const { repos, issues } = parseRepos(raw);
      expect(repos.has("r")).toBe(false);
      expect(issues).toEqual([
        { repo: "r", message: expect.stringContaining("fully transparent") },
      ]);
    }
  });

  it("keeps alpha on override colors", () => {
    const entry = parseRepos({ r: { background: "#000", inactiveForeground: "#ffffff99" } });
    expect(entry.repos.get("r")?.overrides).toEqual({ inactiveForeground: "#ffffff99" });
  });

  it("omits sidebarBlock when not set", () => {
    const entry = parseRepos({ a: { background: "red" } }).repos.get("a");
    expect(entry).not.toHaveProperty("sidebarBlock");
  });

  it("drops entries with an invalid or missing background", () => {
    const { repos, issues } = parseRepos({
      a: "not-a-color",
      b: { foreground: "#fff" },
      c: { background: 12 },
      d: { background: "nope" },
      e: 42,
      ok: "#000",
    });
    expect([...repos.keys()]).toEqual(["ok"]);
    expect(issues.map((issue) => issue.repo)).toEqual(["a", "b", "c", "d", "e"]);
    expect(issues[1]?.message).toBe("Missing background color.");
    expect(issues[2]?.message).toBe("background 12 is not a color string.");
  });

  it("keeps the entry but reports invalid optional fields", () => {
    const { repos, issues } = parseRepos({
      r: {
        background: "#123456",
        foreground: "nope",
        border: 5,
        glyph: "triangle",
        sidebarBlock: "sometimes",
        debuggingBackground: "#fff",
      },
    });
    expect(repos.get("r")).toEqual({ background: "#123456", overrides: {}, glyph: "square" });
    expect(issues).toHaveLength(5);
    expect(issues.every((issue) => issue.repo === "r")).toBe(true);
  });

  it("does not treat inherited properties as entries", () => {
    const raw = Object.create({ inherited: "#fff" }) as Record<string, unknown>;
    raw["own"] = "#000";
    expect([...parseRepos(raw).repos.keys()]).toEqual(["own"]);
  });
});
