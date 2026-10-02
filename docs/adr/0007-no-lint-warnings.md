# 0007. No lint warnings

- Status: Accepted
- Date: 2026-10-02
- Deciders: Marco
- Kind: constraint
- Area: tooling
- Decided in: [architecture-maintenance/0009](../plans/architecture-maintenance/decisions/0009-allow-no-lint-warnings.md)

## Context and Problem

Warnings that don't fail anything pile up until nobody reads them, and then a real problem hides among them.

## Considered Options

- **Errors only**: every lint rule is either `"error"` or `"off"`, and `pnpm lint` runs with `--deny-warnings`, so anything reported fails locally, in the pre-push hook and in CI.
- **Warnings for style, errors for bugs**: the usual split.

## Decision Outcome

Chosen: **errors only**. `pnpm lint` is `oxlint --type-aware --deny-warnings --report-unused-disable-directives`, the same command everywhere, and `.oxlintrc.json` sets no rule to `"warn"`.

## Consequences

- Good: a clean run means clean; an unused disable comment is reported too.
- Bad: turning a rule on means fixing (or deliberately ignoring, see ADR-0008) every finding first.
