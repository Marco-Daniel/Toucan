# 0027. Deliver the maintenance run as three stacked PRs

- Status: Accepted
- Date: 2026-10-02
- Deciders: Marco

## Context and Problem

The run mixes rules, file moves and refactors. One PR would mix moves with behaviour changes and break `git log --follow`; separate plans per topic would lose the overview.

## Considered Options

- One PR
- One plan, three stacked PRs
- A plan per topic

## Decision Outcome

Chosen: one plan, three stacked PRs: #7 `rules-and-adrs` (ADRs, CLAUDE.md, tooling, qmd), #8 `file-moves` (behaviour-neutral restructure) and #9 `dry-upkeep` (tryCatch, object arguments, DRY helpers, Stryker). Each branch runs internal review rounds before its PR opens, so the run feels like one run to Marco, who approved the three PRs by purpose.

## Consequences

- Good: each PR has a clear yardstick
- Bad: rebases or merges up the stack after every change below
