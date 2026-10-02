# 0028. Point the qmd index at the main checkout and re-index after the merges

- Status: Accepted
- Date: 2026-10-02
- Deciders: Marco

## Context and Problem

During the run, the `toucan` index was registered by hand and briefly re-pointed at scratch copies.

## Considered Options

- The main checkout
- An implementer's worktree

## Decision Outcome

Chosen: the main checkout, because worktrees disappear after merging. After #7–#9 merge and the main checkout is on the latest main, run `pnpm docs:index` from main, and remove the two old hand-registered `toucan-*` collections from the default qmd index.

## Consequences

- Good: search stays valid after the run
- Bad: searches see main's docs until the merges
