# 0014. Run checks in a husky pre-push hook

- Status: Accepted
- Date: 2026-10-02
- Deciders: Marco

## Context and Problem

Checks ran only by hand and in CI.

## Considered Options

- A pre-push hook
- A pre-commit hook
- No hook

## Decision Outcome

Chosen: a pre-push hook running typecheck, lint, format:check and test, skipped in CI and with `HUSKY=0`. It also runs for agents' pushes.

## Consequences

- Good: a broken push is caught before CI
- Bad: pushes take a few seconds longer
