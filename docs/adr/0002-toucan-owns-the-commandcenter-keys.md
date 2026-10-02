# 0002. Toucan owns the `commandCenter.*` color keys

- Status: Accepted
- Date: 2026-10-02
- Deciders: Marco
- Kind: constraint
- Area: colors
- Lifted by: [architecture-maintenance/0001](../plans/architecture-maintenance/decisions/0001-lift-system-shaping-decisions-into-a-repo-level-adr-log.md)

## Context and Problem

The user-level `workbench.colorCustomizations` already holds the user's own theme tweaks, and Toucan writes into that same object (ADR-0001). It must never damage those tweaks, yet clean up its own keys reliably, after a crash too.

Lifted from [toucan-v1/0003](../plans/toucan-v1/decisions/0003-toucan-owns-the-commandcenter-namespace.md).

## Considered Options

- **Own every top-level `commandCenter.*` key**: write and remove only those.
- **Track exactly which keys were written** (in globalState): leaves room for hand-set `commandCenter.*` keys, but cleanup then depends on stored state.

## Decision Outcome

Chosen: **own every top-level `commandCenter.*` key**, because those keys only style the search box Toucan is about, and it keeps cleanup stateless. The rules:

- Toucan replaces or removes every top-level `commandCenter.*` key, including ones it doesn't derive.
- Every other key, theme-scoped blocks included, is left exactly as it is.
- In a profile where Toucan never applied a color, it doesn't touch `commandCenter.*` at all, so colors set by hand survive installing it (toucan-v1/0008).

## Consequences

- Good: a simple, deterministic merge; other keys are never touched.
- Bad: once Toucan manages a profile, hand-set `commandCenter.*` keys there are overwritten or removed.
- Follow-ups: the README states this ownership.
