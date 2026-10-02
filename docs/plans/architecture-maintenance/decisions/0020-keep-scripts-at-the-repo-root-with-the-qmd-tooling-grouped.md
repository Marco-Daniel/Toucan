# 0020. Keep scripts at the repo root, with the qmd tooling grouped

- Status: Accepted
- Date: 2026-10-02
- Deciders: Marco

## Context and Problem

Scripts import from src/shared; the question came up whether they belong in src/.

## Considered Options

- Keep `scripts/` at the root
- Move them into `src/`

## Decision Outcome

Chosen: keep `scripts/` at the root: `src/` is what ships, and the lint fence keeps `src/` from importing scripts. Scripts may import from `src/`. The qmd tooling lives in `scripts/qmd/`, following "files that belong together share a folder".

## Consequences

- Good: the shipped tree stays clean
- Bad: scripts depend on src's layout
