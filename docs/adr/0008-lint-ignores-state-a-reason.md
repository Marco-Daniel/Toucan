# 0008. Lint ignores state a reason

- Status: Accepted
- Date: 2026-10-02
- Deciders: Marco
- Kind: direction
- Area: tooling
- Migration: tracked
- Decided in: [architecture-maintenance/0012](../plans/architecture-maintenance/decisions/0012-fix-lint-findings-first-and-give-every-ignore-a-reason.md)

## Context and Problem

With every finding an error (ADR-0007), the only way past a rule is an `oxlint-disable` comment. Without a reason next to it, nobody can later tell a deliberate exception from a shortcut.

## Considered Options

- **A reason on every ignore**: `// oxlint-disable-next-line <rule> -- <reason>`; a whole-file ignore where that reads better. Fix the finding where you can.
- **Ignores without reasons**, explained in the PR instead.
- **No ignores at all.**

## Decision Outcome

Chosen: **a reason on every ignore**, and fixing first: an ignore is for the case where a fix would make the code worse. Today review enforces it. The direction is to enforce it mechanically with an oxlint JS plugin rule that rejects a disable comment without `-- reason`, once oxlint's `jsPlugins` support is stable enough to rely on; that work is tracked rather than done on touch.

## Consequences

- Good: every exception explains itself where it is.
- Bad: until the plugin exists, a reason-less ignore only fails review.
