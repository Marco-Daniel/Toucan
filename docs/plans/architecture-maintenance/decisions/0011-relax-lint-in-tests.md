# 0011. Relax lint in tests

- Status: Accepted
- Date: 2026-10-02
- Deciders: Marco

## Context and Problem

Tests have literal expected values, read JSON as untyped data and can be long; rules aimed at production code mostly add noise there.

## Considered Options

- One test override that relaxes a set family of rules
- Decide rule by rule

## Decision Outcome

Chosen: one override for `test/**`: `no-magic-numbers`, the `no-unsafe-*` family, `no-unsafe-type-assertion`, `max-lines`, `max-lines-per-function` and `no-await-in-loop` are off. `no-await-in-loop` is off for `scripts/**` too. Small style rules stay on.

## Consequences

- Good: tests stay readable
- Bad: tests are linted less strictly than production code
