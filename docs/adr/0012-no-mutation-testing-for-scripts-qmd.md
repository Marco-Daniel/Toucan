# 0012. No mutation testing for scripts/qmd

- Status: Accepted
- Date: 2026-10-02
- Deciders: Marco
- Kind: constraint
- Area: testing
- Decided in: [architecture-maintenance/0025](../plans/architecture-maintenance/decisions/0025-run-strykerjs-on-demand-excluding-the-qmd-scripts.md)

## Context and Problem

Mutation testing (StrykerJS, on demand with `pnpm mutate`) runs the tests with deliberate bugs in the code. `scripts/qmd/` locks files, writes qmd's cache and starts detached worker processes. A mutant there reached a developer's real `~/.cache/qmd` (a test only redirected one of the two variables the cache path comes from), and others left detached workers looping long after the run.

## Considered Options

- **Exclude `scripts/qmd/` from mutation.**
- **Mutate it with more isolation**: pass the active mutant to child processes and sweep stray processes after every run.

## Decision Outcome

Chosen: **exclude it**. Mutating code with file-system and process side effects is too risky and too much machinery for what it finds. `scripts/qmd/` sits at the repo root, outside the extension that `pnpm -C apps/extension mutate` and its `stryker.config.json` cover, so it's never mutated. Its tests still run as usual, and they keep their isolation (HOME and XDG_CACHE_HOME stubbed, detached workers stopped after each test).

## Consequences

- Good: a mutation run can't touch real files or leave processes behind.
- Bad: the qmd scripts' tests are only as good as review makes them; no mutant checks them.
