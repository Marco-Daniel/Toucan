# 0008. Deliver in three PRs: the move, the brand package, the site

- Status: Accepted
- Date: 2026-10-03
- Deciders: Marco

## Context and Problem

The monorepo move, the shared brand package and the site are each large; mixed together, a review can't tell a moved line from a changed one.

## Considered Options

- **Three PRs in order**: the move, `@toucan/brand`, the site and deploy
- One PR

## Decision Outcome

Chosen: **three PRs**, each through the full review loop:
1. **The move**: monorepo layout, Turborepo, config packages, the README split. No behaviour change: the VSIX holds the same 8 files and the same `dist/extension.cjs`, every test passes unchanged in its new place.
2. **`@toucan/brand`**: the shared palette, glyphs, icon and colors, with the extension switched over to it.
3. **The site and its deploy**.

## Consequences

- Good: each diff reviews on its own; the move can be checked mechanically.
- Bad: three loops instead of one; the site waits for the first two.
