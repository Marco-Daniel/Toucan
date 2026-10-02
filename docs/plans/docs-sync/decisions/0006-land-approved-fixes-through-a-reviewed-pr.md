# 0006. Land approved fixes through a reviewed PR

- Status: Accepted
- Date: 2026-10-03
- Deciders: Marco

## Context and Problem

Approved fixes still need a second check: a wrong fix makes a doc less accurate.

## Considered Options

- A normal PR through the review loop
- A direct commit
- Choose per run

## Decision Outcome

Chosen: a normal PR through the review loop. The tag moves only after that PR merges, so a run never counts as done before its fixes are on main.

## Consequences

- Good: Every docs fix is reviewed like any other change.
- Bad: A run takes a PR cycle to complete.
