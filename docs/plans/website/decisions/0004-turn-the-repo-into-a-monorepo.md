# 0004. Turn the repo into a monorepo

- Status: Accepted
- Date: 2026-10-03
- Deciders: Marco

## Context and Problem

A site in the repo brings React, Tailwind and React Router. Adding it next to the extension at the root mixes two products' dependencies, scripts and configs, and every further package makes that worse.

## Considered Options

- **A monorepo**: `apps/` for what ships, `packages/` for shared code, `config/` for shared tool configs
- A workspace with the extension kept at the root and the site as a second package
- A separate repository for the site

## Decision Outcome

Chosen: **a monorepo**:
```
apps/extension/     @toucan/extension: src/, test/, scripts/, media/, the VS Code manifest
apps/site/          @toucan/site
packages/brand/     @toucan/brand (0009)
config/ts-config/   @toucan/ts-config
config/vite/        @toucan/vite-config (Vite and Vitest) (0006)
docs/               ADRs and plans, repo-wide
(root)              pnpm-workspace.yaml, turbo.json, .oxlintrc.json, oxfmt, husky, CI
```
Packages are named under `@toucan/`, are `private`, and each runs its own `lint`, `typecheck`, `test` and `build`. One root `.oxlintrc.json` keeps the rules the same everywhere. ADR-0010 still governs the layout inside `apps/extension/src`; a new repo-level ADR records the monorepo layout.

## Consequences

- Good: each app owns its dependencies and gates; shared code and configs have one home; room to grow (e.g. publishing scripts).
- Bad: a large move: CI, packaging, qmd paths, GROUNDING, CLAUDE.md, ADRs and docs all change paths (0008 keeps that move behaviour-free).

## Amendment (2026-10-03)

The extension keeps the package name `toucan` instead of `@toucan/extension`: the name is part of its ID, `marco-daniel.toucan`. See ADR-0014.
