# 0018. Mirror src under test, with shared test helpers

- Status: Accepted
- Date: 2026-10-02
- Deciders: Marco

## Context and Problem

All tests sat in test/core/, so the VS Code-facing half had none and nothing mapped one-to-one.

## Considered Options

- Mirror the tree under test/
- Colocate tests next to the code

## Decision Outcome

Chosen: mirror `src/` under `test/`; shared test helpers go in `test/helpers/<topic>.ts`, and a helper very specific to one test may stay in it.

## Consequences

- Good: the bundle can never include a test; one place for fixtures
- Bad: a move or rename happens twice
