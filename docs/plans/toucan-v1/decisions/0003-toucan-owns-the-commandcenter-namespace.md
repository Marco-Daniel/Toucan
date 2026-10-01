# 0003. Toucan owns the `commandCenter.*` namespace

- Status: Accepted
- Date: 2026-10-01
- Deciders: Marco

## Context and Problem

The user's global `workbench.colorCustomizations` already holds many personal theme tweaks. Toucan writes into the same object and must never damage them, while still cleaning up its own keys reliably.

## Considered Options

- **Own all `commandCenter.*` keys** — write and remove only those
- **Track exactly which keys were written** in globalState — allows hand-set `commandCenter.*` keys alongside

## Decision Outcome

Chosen: **own all `commandCenter.*`**, because these keys only style the search box Toucan is about, and it keeps cleanup stateless.

## Consequences

- Good: simple, deterministic merge; other keys are never touched.
- Bad: hand-set `commandCenter.*` keys in user settings will be overwritten or removed.
- Follow-ups: document this in the README.
