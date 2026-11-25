// An oxlint JS plugin rule: every lint disable comment states its reason after
// `--` (ADR-0008). oxlint ships no importable plugin types yet, so the few
// shapes this rule uses are declared here. JS plugins are alpha in oxlint and
// outside semver: test/scripts/lint/disableReason.plugin.test.ts runs the real
// oxlint with the repo config, so a release that stops loading or running the
// rule fails the tests instead of passing every disable.

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
/** A reason: `--`, then some text. oxlint itself reads `--reason` as one too. */
const REASON = /\s--\s*\S/;

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
