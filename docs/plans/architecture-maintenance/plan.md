# Plan: Architecture maintenance

## Goal

Make Toucan's code and its rules legible and binding for the agents that work on it. After this run:

- the system's rules and direction live in one ADR log
- the config enforces whatever a tool can enforce
- CLAUDE.md is a short set of rules plus pointers to the rest
- the code is organised so that the path tells you what a file is
- duplication is gone, without over-abstraction

## Non-goals

- No new user-facing features. Behaviour stays the same, apart from failures that are now logged instead of left unhandled.
- No change to the extension's settings, commands or release format.
- No machine enforcement of the conventions Marco chose to keep as conventions: the vscode-in-adapters boundary, the import group headers and the naming. Reviewers hold those.

## Approach

Enforce first, write second (→ [0006](decisions/0006-write-claude-md-as-lean-rules-plus-a-library-of-pointers.md)). Anything a tool can check goes into config: lint, the type checker, tests, the pre-push hook. What tools can't check becomes a short CLAUDE.md rule. The reason behind a rule, and the direction the system is heading, live in repo-level ADRs (→ [0001](decisions/0001-lift-system-shaping-decisions-into-a-repo-level-adr-log.md), [0002](decisions/0002-give-each-adr-a-kind-constraint-background-or-direction.md), [0004](decisions/0004-make-the-adrs-the-most-important-documentation-read-by-every-reviewer.md)). CLAUDE.md names the ADRs as the most important documentation.

The work ships as three stacked PRs, each with internal review rounds before it opens (→ [0027](decisions/0027-deliver-the-maintenance-run-as-three-stacked-prs.md)):

| PR | Branch | Holds |
|---|---|---|
| #7 | `rules-and-adrs` | qmd docs search, tooling config and its fixes, the ADR log, the CLAUDE.md rewrite, this plan |
| #8 | `file-moves` | the behaviour-neutral restructure into core/shared/features |
| #9 | `dry-upkeep` | tryCatch everywhere, object arguments, DRY helpers, upkeep, StrykerJS |

## Components

- **ADR log (`docs/adr/`).** One decision per file, in the same MADR format as plan decisions, plus `Kind` (constraint, background or direction) and `Area` fields. A direction ADR also has a `Migration: as touched | tracked` line. `docs/adr/README.md` holds a short system overview and an index by area (→ [0003](decisions/0003-keep-the-adr-log-readable-as-one-system-checked-by-a-test.md)). Initial set:
  - **Lifted from toucan-v1:** user-scope settings (0001), Toucan owns `commandCenter.*` (0003), stable VS Code API only (GROUNDING, framed by 0007), the toolchain (0010), and the always-on status bar glyph with no font-load fallback detection (0005 and its amendment).
  - **New:**
    - only `*.adapter.ts` and `core/extension.ts` import `vscode`
    - no lint warnings
    - lint ignores state a reason (a direction ADR, tracked, for jsPlugins enforcement)
    - tryCatch is the standard for caught errors
    - the layout (core/shared/features, role suffixes, no barrels)
    - qmd docs search is required
    - `scripts/qmd/` is excluded from Stryker
    - every release ships GitHub release notes

  The source plan decisions get a "Lifted to ADR-NNNN" line.
- **ADR check (a test).** It fails when the index misses an ADR file, or when `src/`, `scripts/`, `test/`, CLAUDE.md or README cite an `ADR-NNNN` that doesn't exist or is superseded. Bare plan-decision citations in code comments become `ADR-NNNN`, or a qualified `toucan-v1/NNNN` where the reason is feature history.
- **CLAUDE.md.** About 80 lines, as a library of pointers (→ 0006). It covers:
  - the ADR pointer and what each kind means
  - the qmd rule (→ [0005](decisions/0005-require-qmd-docs-search-with-its-own-index.md))
  - code rules: ignores with reasons, tryCatch and no `void`, object arguments, shared from the start plus the counter-rule, naming, import groups, the adapter boundary, no barrels
  - condensed test rules, including Stryker
  - the docs-sync rule (→ [0007](decisions/0007-keep-docs-in-sync-through-a-claude-md-rule.md))
  - the public-repo rule

  Every line either prevents a CI or review failure or is a pointer.
- **Tooling config.**
  - oxlint, type-aware with no warnings, on a curated rule set (→ [0009](decisions/0009-allow-no-lint-warnings.md), [0010](decisions/0010-adopt-a-curated-rule-set-with-type-aware-lint-and-tsc.md)), with a lenient test override (→ [0011](decisions/0011-relax-lint-in-tests.md)).
  - tsc with the extra strictness flags.
  - oxfmt at width 100 (→ [0015](decisions/0015-keep-oxfmt-at-width-100-without-import-sorting.md)).
  - A husky pre-push hook (→ [0014](decisions/0014-run-checks-in-a-husky-pre-push-hook.md)).
  - CI jobs with `timeout-minutes: 15`, and vitest with test and hook timeouts.
- **qmd docs search.**
  - `.mcp.json` and a pre-approved MCP server.
  - `pnpm docs:index`.
  - The PostToolUse re-index hook and the SessionStart bootstrap hook.
  - One lock in qmd's per-user cache folder.
  - Toucan's own `toucan` index (→ 0005).
- **Layout.** `src/core/`, `src/shared/<topic>/`, `src/features/<name>/`, with role suffixes and only adapters importing `vscode`. Tests mirror it under `test/`, with `test/helpers/`, no barrels, and `scripts/qmd/` for the qmd tooling (→ [0016](decisions/0016-organise-src-as-core-shared-and-features.md)–[0021](decisions/0021-import-types-separately-and-group-imports-by-role.md)).
- **Code rules applied.**
  - tryCatch everywhere errors are caught, with `notify()` as the one non-awaiting call (→ [0013](decisions/0013-await-every-promise-and-catch-errors-through-trycatch.md)).
  - Object arguments by default (→ [0023](decisions/0023-take-one-object-argument-by-default.md)).
  - The audit's shared helpers (→ [0022](decisions/0022-write-shared-code-from-the-start-without-over-abstracting-it.md)).
  - Unused exports removed (→ [0024](decisions/0024-keep-test-only-exports-and-remove-unused-ones.md)).
- **StrykerJS on demand.** `pnpm mutate [files…]`, with the command runner, excluding `scripts/qmd/` on every path (→ [0025](decisions/0025-run-strykerjs-on-demand-excluding-the-qmd-scripts.md)).

## Data flow

1. An agent working in an area reads the ADRs for it through qmd (`toucan-docs`, `adr/`). It follows CLAUDE.md's rules, and its edits to docs re-index qmd through the hook.
2. On push, the pre-push hook runs typecheck, lint, format:check and test.
3. On review, reviewers judge the diff against the ADRs and CLAUDE.md, and run `pnpm mutate` on the changed files.
4. CI re-runs the gates plus `check:generated`, `check:bundle`, `check:vsix`, and the ADR check test.

## Risks

- **Stacked PRs drift.** Every change below needs a merge up the stack. Mitigation: merge, don't rebase (no force-pushes), and run a stack check on every push.
- **Main ahead of its code.** ADRs 0006 and 0009–0012 and the CLAUDE.md rules describe the layout and tooling completed by #8 and #9; the three merge back-to-back, with nothing landing on main in between.
- **Tooling with side effects.** qmd and its tests write to the user's cache and start background processes. Mitigation:
  - Toucan uses its own named index.
  - Tests isolate HOME and XDG.
  - Tests stop the workers they start.
  - Stryker excludes `scripts/qmd/`.
  - Manual qmd runs only happen against an isolated config.
- **Large review diffs.** The restructure and the object-argument conversion touch most files. Mitigation:
  - Behaviour-neutral commits per area.
  - Bundle diffs and AST comparisons in review.
  - Byte-identical `check:generated`.
- **Conventions not machine-enforced.** The adapter boundary, the import groups and the naming depend on review. Accepted (Marco's choice). Reviewers search for the adapter boundary every round.

## Open questions

- Which existing plan decisions besides the initial set deserve lifting into ADRs: decide while writing the log.
- When oxlint's `jsPlugins` leaves alpha: then switch the ignore-reason rule to lint (direction ADR).

## Assets

- Backlog: [issue #6, docs lint, cleanup and sync skill](https://github.com/Marco-Daniel/Toucan/issues/6), the periodic backstop for 0007.
