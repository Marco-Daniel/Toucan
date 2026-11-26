// An oxlint JS plugin rule: every lint disable comment states its reason after
// `--` (ADR-0008). oxlint ships no importable plugin types yet, so the few
// shapes this rule uses are declared here. JS plugins are alpha in oxlint and
// outside semver: test/scripts/lint/disableReason.plugin.test.ts runs the real
// oxlint with the repo config, so a release that stops loading or running the
// rule fails the tests instead of passing every disable.
//
// What it can't see: oxlint applies disable directives to this rule's reports
// too, so a directive whose range covers its own comment hides the report. With
// oxlint 1.94 that is a block-form disable of every rule (`/* oxlint-disable */`,
// `/* eslint-disable */`), `// oxlint-disable-line` with no rule, and any
// directive that names `toucan/disable-reason`. Review catches those until
// issue #73 adds a check the directives can't reach; the canary pins the gap.

/** A source comment, as `sourceCode.getAllComments()` gives it. */
export interface Comment {
  type: "Line" | "Block" | "Shebang";
  /** The text between the comment markers. */
  value: string;
  start: number;
  end: number;
}

interface Diagnostic {
  message: string;
  node: Comment;
}

/** The part of a rule's context this rule uses. */
interface RuleContext {
  sourceCode: { getAllComments(): Comment[] };
  report(diagnostic: Diagnostic): void;
}

/** A disable directive: `oxlint-disable`, `-line` or `-next-line`, and the `eslint-` spellings oxlint also honours. */
const DIRECTIVE = /^\s*(?:oxlint|eslint)-disable(?:-next-line|-line)?(?:\s|$)/;
/** A reason: `--`, then text with a letter or digit in it (`-- -` is none). oxlint itself reads `--reason` as one too. */
const REASON = /\s--.*[\p{L}\p{N}]/su;

const MESSAGE = "State the reason after `--` in the disable comment (ADR-0008).";

const disableReason = {
  create(context: RuleContext) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          if (DIRECTIVE.test(comment.value) && !REASON.test(comment.value)) {
            context.report({ message: MESSAGE, node: comment });
          }
        }
      },
    };
  },
};

export default {
  meta: { name: "toucan" },
  rules: { "disable-reason": disableReason },
};
