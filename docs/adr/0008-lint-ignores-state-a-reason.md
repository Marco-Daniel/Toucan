# 0008. Lint ignores state a reason

- Status: Accepted
- Date: 2026-10-02
- Deciders: Marco
- Kind: direction
- Area: tooling
- Migration: done 2026-11-25
- Decided in: [architecture-maintenance/0012](../plans/architecture-maintenance/decisions/0012-fix-lint-findings-first-and-give-every-ignore-a-reason.md)

## Context and Problem

With every finding an error (ADR-0007), the only way past a rule is an `oxlint-disable` comment. Without a reason next to it, nobody can later tell a deliberate exception from a shortcut.

## Considered Options

- **A reason on every ignore**: `// oxlint-disable-next-line <rule> -- <reason>`; a whole-file ignore where that reads better. Fix the finding where you can.
- **Ignores without reasons**, explained in the PR instead.
- **No ignores at all.**

## Decision Outcome

Chosen: **a reason on every ignore**, and fixing first: an ignore is for the case where a fix would make the code worse. Review enforced it until 2026-11-25. Since then an oxlint JS plugin rule rejects a disable comment without `-- reason` (see the amendment); that was tracked work rather than done on touch.

## Consequences

- Good: every exception explains itself where it is.
- Bad: a few disable forms hide the rule's own report, so for those a missing reason still fails only review (see the amendment).

## Amendment (2026-11-25): lint enforces it

The tracked work is done. `toucan/disable-reason`, an oxlint JS plugin rule in `scripts/lint/disableReason.plugin.mts`, reports every `oxlint-disable`, `oxlint-disable-line` and `oxlint-disable-next-line` comment, and its `eslint-` spelling, in line or block form, that has no reason after `--`. `.oxlintrc.json` registers it, so it runs in every package's `pnpm lint` and in the root's. oxlint marks JS plugins alpha and outside semver, so three guards keep a breaking release from passing every disable silently: the workspace pins oxlint to an exact version, so every bump needs a pull request (Dependabot's `lint-format` group), where the canary runs; a canary test (`test/scripts/lint/disableReason.plugin.test.ts`) runs the real oxlint with the repo config and expects the rule's findings; and `turbo.json` lists the plugin as a global dependency, so a change to the rule re-runs every lint instead of replaying cached results. A reason-less ignore now fails lint, not only review, with one gap. oxlint applies disable directives to the rule's own reports, so a directive whose range covers its own comment hides the report: a block-form disable of every rule (`/* oxlint-disable */`, `/* eslint-disable */`), `// oxlint-disable-line` with no rule, and any directive that names `toucan/disable-reason`. The rule can't get around that, and oxlint 1.94 has no switch to ignore inline directives. Review still catches those forms; the canary pins them, so a change in oxlint shows up; and issue #73 tracks a check the directives can't reach. The decision above is unchanged.
