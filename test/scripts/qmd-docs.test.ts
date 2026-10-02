import { describe, expect, it } from "vitest";
import {
  DOCS_COLLECTIONS,
  isIndexedDoc,
  parseCollectionShow,
  planIndex,
  type IndexState,
} from "../../scripts/qmd-docs.mts";

const DOCS_CONTEXT = DOCS_COLLECTIONS[0]!.contexts;
const GUIDES_CONTEXT = DOCS_COLLECTIONS[1]!.contexts;

const state = (overrides: Partial<IndexState> = {}): IndexState => ({
  root: "/repo",
  registered: {},
  exists: () => false,
  subfolders: (dir) => (dir === "docs" ? ["adr", "plans"] : []),
  force: false,
  ...overrides,
});

describe("planIndex", () => {
  it("registers both collections with their contexts, then updates and embeds", () => {
    expect(planIndex(state())).toEqual({
      commands: [
        ["collection", "add", "/repo/docs", "--name", "toucan-docs", "--mask", "**/*.md"],
        ["context", "add", "qmd://toucan-docs/", DOCS_CONTEXT[""]],
        ["context", "add", "qmd://toucan-docs/adr", DOCS_CONTEXT["adr"]],
        ["context", "add", "qmd://toucan-docs/plans", DOCS_CONTEXT["plans"]],
        [
          "collection",
          "add",
          "/repo",
          "--name",
          "toucan-guides",
          "--mask",
          "{README.md,GROUNDING.md}",
        ],
        ["context", "add", "qmd://toucan-guides/", GUIDES_CONTEXT[""]],
        ["update"],
        ["embed"],
      ],
      notes: [],
    });
  });

  it("skips the context of a docs subfolder that doesn't exist yet", () => {
    const { commands } = planIndex(
      state({ subfolders: (dir) => (dir === "docs" ? ["plans"] : []) }),
    );
    expect(commands.filter(([verb]) => verb === "context").map((command) => command[2])).toEqual([
      "qmd://toucan-docs/",
      "qmd://toucan-docs/plans",
      "qmd://toucan-guides/",
    ]);
  });

  it("only refreshes contexts for collections already registered as they should be", () => {
    const { commands } = planIndex(
      state({
        registered: {
          "toucan-docs": { path: "/repo/docs", pattern: "**/*.md" },
          "toucan-guides": { path: "/repo", pattern: "{README.md,GROUNDING.md}" },
        },
      }),
    );
    expect(commands.map((command) => command.slice(0, 2).join(" "))).toEqual([
      "context add",
      "context add",
      "context add",
      "context add",
      "update",
      "embed",
    ]);
  });

  it("re-registers a collection whose mask changed", () => {
    const { commands } = planIndex(
      state({
        registered: {
          "toucan-docs": { path: "/repo/docs", pattern: "**/*.md" },
          "toucan-guides": { path: "/repo", pattern: "{README.md,GROUNDING.md,.claude/CLAUDE.md}" },
        },
      }),
    );
    expect(commands.filter(([verb]) => verb === "collection")).toEqual([
      ["collection", "remove", "toucan-guides"],
      [
        "collection",
        "add",
        "/repo",
        "--name",
        "toucan-guides",
        "--mask",
        "{README.md,GROUNDING.md}",
      ],
    ]);
  });

  it("leaves a collection registered at another existing checkout alone, unless forced", () => {
    const elsewhere = {
      registered: { "toucan-docs": { path: "/main/docs", pattern: "**/*.md" } },
      exists: (path: string) => path === "/main/docs",
    };
    const left = planIndex(state(elsewhere));
    expect(left.commands.some((command) => command.includes("toucan-docs"))).toBe(false);
    expect(left.commands.some((command) => command[2]?.startsWith("qmd://toucan-docs"))).toBe(
      false,
    );
    expect(left.notes).toEqual([
      "toucan-docs points at /main/docs, another checkout that still exists; left alone (rerun with --force to point it here).",
    ]);
    expect(planIndex(state({ ...elsewhere, force: true })).commands.slice(0, 2)).toEqual([
      ["collection", "remove", "toucan-docs"],
      ["collection", "add", "/repo/docs", "--name", "toucan-docs", "--mask", "**/*.md"],
    ]);
  });

  it("re-points a collection whose old checkout is gone", () => {
    const { commands } = planIndex(
      state({ registered: { "toucan-docs": { path: "/moved/docs", pattern: "**/*.md" } } }),
    );
    expect(commands.slice(0, 2)).toEqual([
      ["collection", "remove", "toucan-docs"],
      ["collection", "add", "/repo/docs", "--name", "toucan-docs", "--mask", "**/*.md"],
    ]);
  });

  it("notes a docs subfolder without a context", () => {
    const { notes } = planIndex(
      state({ subfolders: (dir) => (dir === "docs" ? ["plans", "guides"] : []) }),
    );
    expect(notes).toEqual([
      "docs/guides has no context yet: add one to DOCS_COLLECTIONS in scripts/qmd-docs.mts.",
    ]);
  });

  it("never names a collection other than toucan-*", () => {
    // qmd's config is global and holds other projects' collections.
    const names = planIndex(
      state({
        registered: { "toucan-docs": { path: "/moved/docs", pattern: "*.md" } },
        force: true,
      }),
    ).commands.flatMap((command) => [
      ...(command[0] === "collection" && command[1] === "remove" ? [command[2]] : []),
      ...command.filter((_, i) => command[i - 1] === "--name"),
      ...command.filter((arg) => arg.startsWith("qmd://")).map((uri) => uri.slice(6).split("/")[0]),
    ]);
    expect(names.length).toBeGreaterThan(0);
    expect(names.filter((name) => !name?.startsWith("toucan-"))).toEqual([]);
  });
});

describe("parseCollectionShow", () => {
  it("reads the path and pattern", () => {
    const output = [
      "Collection: toucan-docs",
      "  Path:     /work/toucan/docs",
      "  Pattern:  **/*.md",
      "  Include:  yes (default)",
    ].join("\n");
    expect(parseCollectionShow(output)).toEqual({
      path: "/work/toucan/docs",
      pattern: "**/*.md",
    });
  });

  it("trims padding around the values", () => {
    expect(parseCollectionShow("  Path:     /x/docs   \n  Pattern:  **/*.md  \n")).toEqual({
      path: "/x/docs",
      pattern: "**/*.md",
    });
  });

  it("gives nothing for output without both", () => {
    expect(parseCollectionShow("Collection not found: toucan-docs")).toBeUndefined();
    expect(parseCollectionShow("  Path:     /x")).toBeUndefined();
  });
});

describe("isIndexedDoc", () => {
  it.each([
    ["/repo/docs/plans/glyph-set/plan.md", true],
    ["/repo/docs/adr/0001-rules.md", true],
    ["/repo/README.md", true],
    ["/repo/GROUNDING.md", true],
    ["/repo/docs/plans/glyph-set/assets/glyph-sheet.py", false],
    ["/repo/.claude/CLAUDE.md", false],
    ["/repo/src/core/glyphs.ts", false],
    ["/repo/src/README.md", false],
    ["/elsewhere/docs/plan.md", false],
  ])("%s → %s", (file, indexed) => {
    expect(isIndexedDoc(file, "/repo")).toBe(indexed);
  });
});
