# 0022. Write shared code from the start, without over-abstracting it

- Status: Accepted
- Date: 2026-10-02
- Deciders: Marco

## Context and Problem

AI agents tend to duplicate code. The duplication audit found a dozen repeated helpers and patterns.

## Considered Options

- Extract at the second copy
- Extract at the third copy
- Shared from the start

## Decision Outcome

Chosen: shared from the start: code another feature could use unchanged goes to `shared/<topic>/` straight away, even with one caller; feature-specific code stays in its feature. The counter-rule forbids speculative options, generic types nobody needs, single-call wrapper layers, feature rules phrased as generic code, and merging look-alikes that change for different reasons.

## Consequences

- Good: less duplication, without bloated helpers
- Bad: judgement about what "another feature could use unchanged" means
