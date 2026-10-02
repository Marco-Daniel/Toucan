import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  DOCS_COLLECTIONS,
  isIndexedDoc,
  parseCollectionList,
  parseCollectionShow,
  planIndex,
  type IndexState,
} from "../../scripts/qmd-docs.mts";

const DOCS_CONTEXT = DOCS_COLLECTIONS[0]!.contexts;
const GUIDES_CONTEXT = DOCS_COLLECTIONS[1]!.contexts;

/** The plan with each command's leading `--index toucan` checked and stripped. */
function plan(overrides: Partial<IndexState> = {}) {
  const { commands, notes } = planIndex(state(overrides));
  for (const command of commands) {
    expect(command.slice(0, 2)).toEqual(["--index", "toucan"]);
  }
  return { commands: commands.map((command) => command.slice(2)), notes };
}

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
    expect(plan()).toEqual({
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

  it("leaves out the embedding when asked for keyword search only", () => {
    const { commands } = planIndex(state(), { embed: false });
    expect(commands.at(-1)).toEqual(["--index", "toucan", "update"]);
    expect(commands.some((command) => command.includes("embed"))).toBe(false);
  });

  it("skips the context of a docs subfolder that doesn't exist yet", () => {
    const { commands } = plan({ subfolders: (dir) => (dir === "docs" ? ["plans"] : []) });
    expect(commands.filter(([verb]) => verb === "context").map((command) => command[2])).toEqual([
      "qmd://toucan-docs/",
      "qmd://toucan-docs/plans",
      "qmd://toucan-guides/",
    ]);
  });

  it("only refreshes contexts for collections already registered as they should be", () => {
    const { commands } = plan({
      registered: {
        "toucan-docs": { path: "/repo/docs", pattern: "**/*.md" },
        "toucan-guides": { path: "/repo", pattern: "{README.md,GROUNDING.md}" },
      },
    });
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
    const { commands } = plan({
      registered: {
        "toucan-docs": { path: "/repo/docs", pattern: "**/*.md" },
        "toucan-guides": { path: "/repo", pattern: "{README.md,GROUNDING.md,.claude/CLAUDE.md}" },
      },
    });
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
    const left = plan(elsewhere);
    expect(left.commands.some((command) => command.includes("toucan-docs"))).toBe(false);
    expect(left.commands.some((command) => command[2]?.startsWith("qmd://toucan-docs"))).toBe(
      false,
    );
    expect(left.notes).toEqual([
      "toucan-docs points at /main/docs, another checkout that still exists; left alone (rerun with --force to point it here).",
    ]);
    expect(plan({ ...elsewhere, force: true }).commands.slice(0, 2)).toEqual([
      ["collection", "remove", "toucan-docs"],
      ["collection", "add", "/repo/docs", "--name", "toucan-docs", "--mask", "**/*.md"],
    ]);
  });

  it("re-points a collection whose old checkout is gone", () => {
    const { commands } = plan({
      registered: { "toucan-docs": { path: "/moved/docs", pattern: "**/*.md" } },
    });
    expect(commands.slice(0, 2)).toEqual([
      ["collection", "remove", "toucan-docs"],
      ["collection", "add", "/repo/docs", "--name", "toucan-docs", "--mask", "**/*.md"],
    ]);
  });

  it("notes a docs subfolder without a context", () => {
    const { notes } = plan({ subfolders: (dir) => (dir === "docs" ? ["plans", "guides"] : []) });
    expect(notes).toEqual([
      "docs/guides has no context yet: add one to DOCS_COLLECTIONS in scripts/qmd-docs.mts.",
    ]);
  });

  it("never names a collection other than toucan-*", () => {
    // Defence in depth: even in Toucan's own index, only toucan-* collections are touched.
    const { commands } = plan({
      registered: { "toucan-docs": { path: "/moved/docs", pattern: "*.md" } },
      force: true,
    });
    const names: (string | undefined)[] = [];
    for (const command of commands) {
      if (command[0] === "collection" && command[1] === "remove") {
        names.push(command[2]);
      }
      const name = command.indexOf("--name");
      if (name >= 0) {
        names.push(command[name + 1]);
      }
      for (const uri of command.filter((arg) => arg.startsWith("qmd://"))) {
        names.push(uri.slice(6).split("/")[0]);
      }
    }
    expect(names.length).toBeGreaterThan(0);
    expect(names.filter((name) => !name?.startsWith("toucan-"))).toEqual([]);
  });
});

describe(".mcp.json", () => {
  it("starts qmd's MCP server on Toucan's own index", () => {
    const config = JSON.parse(readFileSync(new URL("../../.mcp.json", import.meta.url), "utf8"));
    expect(config).toEqual({
      mcpServers: { qmd: { type: "stdio", command: "qmd", args: ["--index", "toucan", "mcp"] } },
    });
  });
});

describe("parseCollectionList", () => {
  it("finds Toucan's collections, each at the start of its line", () => {
    const output = [
      "Collections (4):",
      "",
      "toucan-docs (qmd://toucan-docs/)",
      "  Pattern:  **/*.md",
      "not-toucan-guides (qmd://not-toucan-guides/)",
      "  toucan-indented (qmd://toucan-indented/)",
      "notes (qmd://notes/)",
    ].join("\n");
    expect([...parseCollectionList(output)]).toEqual(["toucan-docs"]);
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
    ["/repo/src/features/glyphs/glyphs.util.ts", false],
    ["/repo/src/README.md", false],
    ["/elsewhere/docs/plan.md", false],
  ])("%s → %s", (file, indexed) => {
    expect(isIndexedDoc(file, "/repo")).toBe(indexed);
  });
});
