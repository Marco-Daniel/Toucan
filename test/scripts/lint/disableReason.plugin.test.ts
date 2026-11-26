// The disable-reason rule (ADR-0008): which comments it reports, through a fake
// context, and a canary that runs the real oxlint with the repo config the way
// `pnpm lint` does. JS plugins are alpha in oxlint, so a release that stops
// loading the plugin or handing it the comments turns the canary red. The
// canary also pins the forms oxlint hides from the rule (issue #73).
// import libraries
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// import utils
import { tryCatchSync } from "../../../apps/extension/src/shared/async/tryCatch.util.ts";
import plugin from "../../../scripts/lint/disableReason.plugin.mts";
import { ROOT } from "../../helpers/workspace.ts";

// import types
import type { Comment } from "../../../scripts/lint/disableReason.plugin.mts";

const MESSAGE = "State the reason after `--` in the disable comment (ADR-0008).";

/** Each report as its message and the reported comment's value, in the order the rule reports them. */
function collectReports(comments: Pick<Comment, "type" | "value">[]): string[] {
  const reports: string[] = [];
  const visitor = plugin.rules["disable-reason"].create({
    sourceCode: {
      getAllComments: () => comments.map((comment) => ({ ...comment, start: 0, end: 0 })),
    },
    report: ({ message, node }) => reports.push(`${message} ${JSON.stringify(node.value)}`),
  });
  visitor.Program();
  return reports;
}

describe("the disable-reason rule", () => {
  it.each([
    ["a next-line disable", " oxlint-disable-next-line no-void"],
    ["a same-line disable", " oxlint-disable-line no-void"],
    ["a whole-file disable of one rule", " oxlint-disable no-void"],
    ["a whole-file disable of every rule", " oxlint-disable"],
    ["a disable with no space after the marker", "oxlint-disable-next-line no-void"],
    ["the eslint- spelling", " eslint-disable-next-line no-void"],
    ["an empty reason", " oxlint-disable-next-line no-void --"],
    ["a reason of only spaces", " oxlint-disable-next-line no-void --   "],
    ["a `--` glued to the rule name", " oxlint-disable-next-line no-void-- the reason"],
    ["a reason of only dashes", " oxlint-disable-next-line no-void ---"],
    ["a reason of a lone dash", " oxlint-disable-next-line no-void -- -"],
  ])("reports %s", (_what, value) => {
    expect(collectReports([{ type: "Line", value }])).toEqual([
      `${MESSAGE} ${JSON.stringify(value)}`,
    ]);
  });

  it.each([
    ["a disable with a reason", " oxlint-disable-next-line no-void -- nothing to await"],
    ["a reason glued to `--`", " oxlint-disable-next-line no-void --nothing to await"],
    ["a reason on the next line of a block", " oxlint-disable no-void\n   -- nothing to await "],
    ["a reason that starts with code", " oxlint-disable-next-line no-void -- `{}` is meant"],
    ["a reason of only a digit", " oxlint-disable-next-line no-void -- 2"],
    ["a reason of only a non-ASCII letter", " oxlint-disable-next-line no-void -- é"],
    ["an enable", " oxlint-enable no-void"],
    ["a mention later in the text", " see oxlint-disable-next-line in ADR-0008"],
    ["a longer word that starts like a directive", " oxlint-disable-next-lines no-void"],
    ["a plain comment", " nothing to see here"],
  ])("passes %s", (_what, value) => {
    expect(collectReports([{ type: "Line", value }])).toEqual([]);
  });

  it("reports only the comments without a reason, in source order", () => {
    expect(
      collectReports([
        { type: "Shebang", value: "/usr/bin/env node" },
        { type: "Line", value: " oxlint-disable-next-line no-var" },
        { type: "Block", value: " oxlint-disable-next-line no-void -- a reason " },
        { type: "Block", value: " oxlint-disable-next-line no-void " },
      ]),
    ).toEqual([
      `${MESSAGE} " oxlint-disable-next-line no-var"`,
      `${MESSAGE} " oxlint-disable-next-line no-void "`,
    ]);
  });
});

interface OxlintDiagnostic {
  code: string;
  labels: { span: { line: number } }[];
}

interface LintResult {
  status: number | null;
  /** Each diagnostic as `<code> at line <n>`. */
  findings: string[];
}

describe("the canary: oxlint runs the rule with the repo config", () => {
  let dir = "";

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "toucan-lint-"));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  /** Lints a fixture with the flags every package's `lint` script passes. */
  function lint(source: string): LintResult {
    const file = join(dir, "fixture.ts");
    writeFileSync(file, source);
    const run = spawnSync(
      process.execPath,
      [
        join(ROOT, "node_modules/oxlint/bin/oxlint"),
        "-c",
        join(ROOT, ".oxlintrc.json"),
        "--type-aware",
        "--deny-warnings",
        "--report-unused-disable-directives",
        "--format",
        "json",
        file,
      ],
      { encoding: "utf8" },
    );
    // A plugin that fails to load leaves no JSON on stdout: say why instead.
    const [report, error] = tryCatchSync(
      () => JSON.parse(run.stdout) as { diagnostics: OxlintDiagnostic[] },
    );
    if (error !== null) {
      throw new Error(`oxlint gave no report (exit ${run.status}): ${run.stderr}${run.stdout}`);
    }
    return {
      status: run.status,
      findings: report.diagnostics.map(
        ({ code, labels }) => `${code} at line ${labels[0]?.span.line}`,
      ),
    };
  }

  it("fails the per-line forms without a reason, in both spellings, and nothing else", () => {
    const result = lint(
      [
        "// oxlint-disable-next-line no-var",
        "export var lineForm = 1;",
        "/* oxlint-disable-next-line no-var */",
        "export var blockForm = 1;",
        "export var sameLine = 1; // oxlint-disable-line no-var",
        "// eslint-disable-next-line no-var",
        "export var eslintForm = 1;",
        "",
      ].join("\n"),
    );
    // No no-var finding: the disables still work, the rule only adds its own.
    expect(result).toEqual({
      status: 1,
      findings: [
        "toucan(disable-reason) at line 1",
        "toucan(disable-reason) at line 3",
        "toucan(disable-reason) at line 5",
        "toucan(disable-reason) at line 6",
      ],
    });
  });

  it.each([
    ["a line-form disable of every rule", "// oxlint-disable"],
    ["a block-form disable of one rule", "/* oxlint-disable no-var */"],
    ["the eslint- spelling of one rule", "/* eslint-disable no-var */"],
  ])("fails %s for the whole file without a reason", (_what, directive) => {
    expect(lint([directive, "export var a = 1;", ""].join("\n"))).toEqual({
      status: 1,
      findings: ["toucan(disable-reason) at line 1"],
    });
  });

  // oxlint applies the directive to the rule's own report: until issue #73
  // adds a check the directives can't reach, these pass, and review catches them.
  it.each([
    ["a block-form disable of every rule", ["/* oxlint-disable */", "export var a = 1;"]],
    ["its eslint- spelling", ["/* eslint-disable */", "export var a = 1;"]],
    ["a same-line disable of every rule", ["export var a = 1; // oxlint-disable-line"]],
    [
      "a directive that names the rule",
      [
        "/* oxlint-disable toucan/disable-reason */",
        "// oxlint-disable-next-line no-var",
        "export var a = 1;",
      ],
    ],
  ])("cannot see %s, which hides the rule's own report", (_what, lines) => {
    expect(lint([...lines, ""].join("\n"))).toEqual({ status: 0, findings: [] });
  });

  it("passes a disable with a reason", () => {
    const result = lint(
      [
        "// oxlint-disable-next-line no-var -- the canary needs a var",
        "export var a = 1;",
        "",
      ].join("\n"),
    );
    expect(result).toEqual({ status: 0, findings: [] });
  });
});
