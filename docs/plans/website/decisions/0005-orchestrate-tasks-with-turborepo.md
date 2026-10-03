# 0005. Orchestrate tasks with Turborepo

- Status: Accepted
- Date: 2026-10-03
- Deciders: Marco

## Context and Problem

With several workspace packages, something has to run lint, typecheck, test and build in dependency order, and CI should skip what didn't change.

## Considered Options

- **Turborepo**
- Plain `pnpm -r` / `--filter`

## Decision Outcome

Chosen: **Turborepo**. `build`, `typecheck`, `lint` and `test` declare `dependsOn: ["^…"]`, outputs are declared so cache hits restore files, and `turbo run … --filter=...[origin/main]` runs only what a change affects. The deploy workflow uses the same graph to tell whether the site (or `@toucan/brand`, which it depends on) changed. Generic `turbo run <task> --filter=<pkg>` replaces a hand-written root script per app.

## Consequences

- Good: dependency-ordered, cached tasks; affected-only CI and deploys.
- Bad: one more tool and config; declared outputs must stay honest or cache hits replay logs without files.
