# 0003. Keep the skill in the repo

- Status: Accepted
- Date: 2026-10-03
- Deciders: Marco

## Context and Problem

The skill could be a personal skill working across repos, or part of Toucan.

## Considered Options

- In the repo, `.claude/skills/docs-sync/`
- A personal skill

## Decision Outcome

Chosen: in the repo, so every contributor and agent gets it, and it can rely on Toucan's own setup (the qmd `toucan` index, the ADR kinds, the CLAUDE.md rules). It changes through normal review.

## Consequences

- Good: Shared and reviewed like code.
- Bad: Toucan-specific; not reusable elsewhere as is.
