# 0015. Keep oxfmt at width 100, without import sorting

- Status: Accepted
- Date: 2026-10-02
- Deciders: Marco

## Context and Problem

oxfmt formats at width 100; 120 is a common alternative. oxfmt can sort imports.

## Considered Options

- Keep 100
- Move to 120

## Decision Outcome

Chosen: keep 100, since it causes no reformatting. Import order is a convention (see 0021), not sorted by the formatter.

## Consequences

- Good: no churn
- Bad: import order isn't machine-enforced
