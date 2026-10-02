// import libraries
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// import utils
import {
  adrStatus,
  adrStatusChanges,
  diffCommands,
  diffScripts,
  diffSettings,
  diffSymbols,
  exportedSymbols,
  isSourceFile,
  parseNameStatus,
} from "../../scripts/docs-sync.mts";

const SCRIPT = new URL("../../scripts/docs-sync.mts", import.meta.url).pathname;

describe("parseNameStatus", () => {
  it("sorts git's name-status lines by kind of change", () => {
    const text = [
      "A\tsrc/new.ts",
      "D\tdocs/old.md",
      "M\tREADME.md",
      "T\tscripts/link.mts",
      "R087\tsrc/before.ts\tsrc/after.ts",
      "",
    ].join("\n");
    expect(parseNameStatus(text)).toEqual({
      added: ["src/new.ts"],
      removed: ["docs/old.md"],
      renamed: [{ from: "src/before.ts", to: "src/after.ts" }],
      modified: ["README.md", "scripts/link.mts"],
    });
  });

  it("finds nothing in an empty diff", () => {
    expect(parseNameStatus("")).toEqual({ added: [], removed: [], renamed: [], modified: [] });
  });
});

describe("diffScripts", () => {
  it("names the scripts added, removed and given another command", () => {
    expect(
      diffScripts({
        before: { scripts: { build: "tsdown", lint: "oxlint", test: "vitest run" } },
        after: { scripts: { test: "vitest run --silent", lint: "oxlint", mutate: "node m.mts" } },
      }),
    ).toEqual({ added: ["mutate"], removed: ["build"], changed: ["test"] });
  });

  it("treats a missing package.json as having no scripts", () => {
    expect(diffScripts({ before: undefined, after: { scripts: { b: "x", a: "y" } } })).toEqual({
      added: ["a", "b"],
      removed: [],
      changed: [],
    });
  });
});

describe("diffSettings", () => {
  it("compares the setting keys, whether configuration is one object or a list", () => {
    expect(
      diffSettings({
        before: {
          contributes: {
            configuration: { properties: { "toucan.repos": {}, "toucan.old": {} } },
          },
        },
        after: {
          contributes: {
            configuration: [
              { properties: { "toucan.repos": {} } },
              { properties: { "toucan.new": {} } },
            ],
          },
        },
      }),
    ).toEqual({ added: ["toucan.new"], removed: ["toucan.old"] });
  });

  it("reports every key removed when the configuration goes", () => {
    expect(
      diffSettings({
        before: { contributes: { configuration: { properties: { "toucan.repos": {} } } } },
        after: { contributes: {} },
      }),
    ).toEqual({ added: [], removed: ["toucan.repos"] });
  });
});

describe("diffCommands", () => {
  it("compares the contributed command ids and skips entries without one", () => {
    expect(
      diffCommands({
        before: { contributes: { commands: [{ command: "toucan.setColor" }, { command: "t.a" }] } },
        after: {
          contributes: {
            commands: [{ command: "toucan.setColor" }, { command: "toucan.clear" }, { title: "x" }],
          },
        },
      }),
    ).toEqual({ added: ["toucan.clear"], removed: ["t.a"] });
  });

  it("reports every id removed when the commands go", () => {
    expect(
      diffCommands({
        before: { contributes: { commands: [{ command: "toucan.setColor" }] } },
        after: {},
      }),
    ).toEqual({ added: [], removed: ["toucan.setColor"] });
  });
});

describe("adrStatusChanges", () => {
  it("lists the ADRs whose status changed, appeared or went, by number", () => {
    expect(
      adrStatusChanges({
        before: new Map([
          ["0004", "Accepted"],
          ["0001", "Accepted"],
          ["0002", "Accepted"],
        ]),
        after: new Map([
          ["0001", "Accepted"],
          ["0002", "Superseded by ADR-0003"],
          ["0003", "Accepted"],
        ]),
      }),
    ).toEqual([
      { adr: "0002", from: "Accepted", to: "Superseded by ADR-0003" },
      { adr: "0003", from: null, to: "Accepted" },
      { adr: "0004", from: "Accepted", to: null },
    ]);
  });
});

describe("adrStatus", () => {
  it("reads the Status line's value", () => {
    expect(adrStatus("# 0002. X\n\n- Status: Superseded by ADR-0003  \n- Date: 2026-10-02\n")).toBe(
      "Superseded by ADR-0003",
    );
  });

  it("only reads a Status line that starts the line", () => {
    expect(adrStatus("Was: - Status: Proposed\n- Status: Accepted\n")).toBe("Accepted");
  });

  it("is undefined without a Status line", () => {
    expect(adrStatus("# 0002. X\n\nStatus: Accepted\n")).toBeUndefined();
  });
});

describe("exportedSymbols", () => {
  it("lists every exported declaration and export-list name, sorted, once each", () => {
    const text = [
      "export function setColor() {}",
      "export async function clearColor() {}",
      "export const PRESETS = [];",
      "export class Preview {}",
      "export interface CommandHost {}",
      "export type Hex = string;",
      "export enum Kind {}",
      "export default function main() {}",
      "function internal() {}",
      "const hidden = 1;",
      "export { hidden as shown, internal, type Hex };",
      "  export const indented = 1;",
      "// export { commented }",
      "export declare const DECLARED: number;",
      "export  declare  abstract  class  Ambient {}",
      "export  default  async  function  spaced() {}",
      "export abstract class Shape {}",
      "export function* generate() {}",
      "export type { Only };",
      "export  type  { Spaced };",
      "export  { listed, };",
      "export { inner  as  outer, type  Doubled };",
    ].join("\n");
    expect(exportedSymbols(text)).toEqual([
      "Ambient",
      "CommandHost",
      "DECLARED",
      "Doubled",
      "Hex",
      "Kind",
      "Only",
      "PRESETS",
      "Preview",
      "Shape",
      "Spaced",
      "clearColor",
      "generate",
      "internal",
      "listed",
      "main",
      "outer",
      "setColor",
      "shown",
      "spaced",
    ]);
  });
});

describe("isSourceFile", () => {
  it.each([
    ["src/features/commands/setColor.adapter.ts", true],
    ["scripts/docs-sync.mts", true],
    ["src/types.d.ts", false],
    ["docs/snippet.ts", false],
    ["vendor/src/lib.ts", false],
    ["src/notes.ts.md", false],
    ["README.md", false],
  ])("%s: %s", (path, expected) => {
    expect(isSourceFile(path)).toBe(expected);
  });
});

describe("diffSymbols", () => {
  it("compares the exported names across files, so a move between files isn't a change", () => {
    expect(
      diffSymbols({
        before: ["export function a() {}\nexport const B = 1;", "export function moved() {}"],
        after: ["export function a() {}", "export function moved() {}\nexport type C = 1;"],
      }),
    ).toEqual({ added: ["C"], removed: ["B"] });
  });
});

describe("the docs-sync command", () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "toucan-docs-sync-"));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  // Git in the test's repo only: no user or system config, a fixed identity.
  // Stryker's active mutant goes along, so `pnpm mutate` reaches the CLI too.
  const mutant = process.env["__STRYKER_ACTIVE_MUTANT__"];
  const env = () => ({
    PATH: process.env["PATH"] ?? "",
    HOME: dir,
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_CONFIG_NOSYSTEM: "1",
    // Never a repo in a folder above the test's own.
    GIT_CEILING_DIRECTORIES: dirname(dir),
    GIT_AUTHOR_NAME: "Test",
    GIT_AUTHOR_EMAIL: "test@example.com",
    GIT_COMMITTER_NAME: "Test",
    GIT_COMMITTER_EMAIL: "test@example.com",
    ...(mutant === undefined ? {} : { __STRYKER_ACTIVE_MUTANT__: mutant }),
  });

  const git = (...args: string[]) => {
    const result = spawnSync("git", args, { cwd: dir, env: env(), encoding: "utf8" });
    // The whole result, so a failing git call shows its stderr.
    expect(result).toMatchObject({ status: 0 });
    return result.stdout.trim();
  };

  const write = (files: Record<string, string>) => {
    for (const [path, text] of Object.entries(files)) {
      mkdirSync(dirname(join(dir, path)), { recursive: true });
      writeFileSync(join(dir, path), text);
    }
  };

  const commit = (files: Record<string, string>) => {
    write(files);
    git("add", "-A");
    git("commit", "-q", "-m", "change");
  };

  const run = (...args: string[]) =>
    spawnSync(process.execPath, [SCRIPT, ...args], { cwd: dir, env: env(), encoding: "utf8" });

  interface ManifestArgs {
    scripts: Record<string, string>;
    settings: string[];
    commands: string[];
  }
  const manifest = ({ scripts, settings, commands }: ManifestArgs) =>
    JSON.stringify({
      scripts,
      contributes: {
        configuration: { properties: Object.fromEntries(settings.map((key) => [key, {}])) },
        commands: commands.map((command) => ({ command })),
      },
    });

  it("reports what changed since the docs-sync/last tag", () => {
    git("init", "-q", "-b", "main");
    commit({
      "package.json": manifest({
        scripts: { build: "tsdown", lint: "oxlint" },
        settings: ["t.repos", "t.old"],
        commands: ["t.set"],
      }),
      "docs/adr/0001-one.md": "# 0001. One\n\n- Status: Accepted\n",
      "src/old.ts": "export function gone() {}\nexport const KEPT = 1;\n",
      "src/same.ts": "export function untouched() {}\n",
      "src/moving.ts": "export function moving() {}\n",
      "README.md": "Toucan\n",
    });
    git("tag", "docs-sync/last");
    rmSync(join(dir, "src/old.ts"));
    git("mv", "src/moving.ts", "src/moved.ts");
    commit({
      "package.json": manifest({
        scripts: { build: "tsdown --minify", test: "vitest" },
        settings: ["t.repos"],
        commands: ["t.set", "t.clear"],
      }),
      "docs/adr/0001-one.md": "# 0001. One\n\n- Status: Superseded by ADR-0002\n",
      "docs/adr/0002-two.md": "# 0002. Two\n\n- Status: Accepted\n",
      "src/new.ts": "export function arrived() {}\nexport const KEPT = 1;\n",
      "README.md": "Toucan, again\n",
      // Not a source file, so its export line isn't a symbol.
      "docs/snippet.md": "export function fromDocs() {}\n",
      // A backup copy isn't an ADR.
      "docs/adr/0003-draft.md.orig": "# 0003. Draft\n\n- Status: Proposed\n",
    });
    // Staged but not committed: the report covers HEAD only.
    write({
      "package.json": "{}",
      "src/staged.ts": "export function staged() {}\n",
      "src/new.ts": "export function stagedOnly() {}\n",
      "docs/adr/0001-one.md": "# 0001. One\n\n- Status: Accepted\n",
    });
    git("add", "-A");
    const result = run();
    expect({ status: result.status, stderr: result.stderr }).toEqual({ status: 0, stderr: "" });
    expect(JSON.parse(result.stdout)).toEqual({
      since: "docs-sync/last",
      head: git("rev-parse", "HEAD"),
      full: false,
      files: {
        added: [
          "docs/adr/0002-two.md",
          "docs/adr/0003-draft.md.orig",
          "docs/snippet.md",
          "src/new.ts",
        ],
        removed: ["src/old.ts"],
        renamed: [{ from: "src/moving.ts", to: "src/moved.ts" }],
        modified: ["README.md", "docs/adr/0001-one.md", "package.json"],
      },
      scripts: { added: ["test"], removed: ["lint"], changed: ["build"] },
      settings: { added: [], removed: ["t.old"] },
      commands: { added: ["t.clear"], removed: [] },
      adrStatuses: [
        { adr: "0001", from: "Accepted", to: "Superseded by ADR-0002" },
        { adr: "0002", from: null, to: "Accepted" },
      ],
      symbols: { added: ["arrived"], removed: ["gone"] },
    });
  });

  it("takes another ref with --since", () => {
    git("init", "-q", "-b", "main");
    commit({ "a.md": "a\n" });
    const first = git("rev-parse", "HEAD");
    commit({ "b.md": "b\n" });
    const result = run("--since", first);
    expect({ status: result.status, stderr: result.stderr }).toEqual({ status: 0, stderr: "" });
    expect(JSON.parse(result.stdout)).toMatchObject({
      since: first,
      full: false,
      files: { added: ["b.md"], removed: [], renamed: [], modified: [] },
    });
  });

  it("asks for a full sweep when there's no docs-sync/last tag yet", () => {
    git("init", "-q", "-b", "main");
    commit({ "a.md": "a\n" });
    const result = run();
    expect({ status: result.status, stderr: result.stderr }).toEqual({ status: 0, stderr: "" });
    expect(JSON.parse(result.stdout)).toEqual({
      since: null,
      head: git("rev-parse", "HEAD"),
      full: true,
      reason: "no docs-sync/last tag: sweep every doc",
    });
  });

  it("asks for a full sweep when the ref resolves but can't be diffed", () => {
    git("init", "-q", "-b", "main");
    commit({ "a.md": "a\n" });
    // A tag on a blob resolves, but git can't diff it against a commit.
    git("tag", "docs-sync/last", git("hash-object", "-w", "a.md"));
    const result = run();
    expect({ status: result.status, stderr: result.stderr }).toEqual({ status: 0, stderr: "" });
    expect(JSON.parse(result.stdout)).toEqual({
      since: null,
      head: git("rev-parse", "HEAD"),
      full: true,
      reason: "can't diff from docs-sync/last (shallow clone?): sweep every doc",
    });
  });

  it("fails when --since has no ref", () => {
    git("init", "-q", "-b", "main");
    commit({ "a.md": "a\n" });
    expect(run("--since")).toMatchObject({
      status: 1,
      stdout: "",
      stderr: "--since needs a ref\n",
    });
  });

  it("fails outside a git checkout", () => {
    expect(run()).toMatchObject({
      status: 1,
      stdout: "",
      stderr: "Error: docs-sync needs a git checkout with a HEAD commit\n",
    });
  });
});
