# 0025. Run StrykerJS on demand, excluding the qmd scripts

- Status: Accepted
- Date: 2026-10-02
- Deciders: Marco

## Context and Problem

Reviewers had been hand-writing mutants every round to prove the tests could fail; it found real gaps almost every time.

## Considered Options

- On demand
- In CI with a threshold
- Not yet

## Decision Outcome

Chosen: on demand: `pnpm mutate [files…]`, never in CI or pre-push. It uses Stryker's command runner, because its Vitest runner doesn't switch mutants on with Vitest 5. `scripts/qmd/` is excluded, because mutating code with filesystem and process side effects proved too troublesome: lock files in the real qmd cache, and orphaned background workers. The CLAUDE.md rule: run it on the files you changed, read every survivor, kill it with a test or say why it's equivalent, never chase the percentage.

## Consequences

- Good: a repeatable, mechanical answer to "can this test fail?"
- Bad: a full run takes minutes; the qmd scripts rely on their hand-checked tests
