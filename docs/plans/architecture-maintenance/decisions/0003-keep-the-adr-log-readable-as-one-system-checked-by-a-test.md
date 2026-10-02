# 0003. Keep the ADR log readable as one system, checked by a test

- Status: Accepted
- Date: 2026-10-02
- Deciders: Marco

## Context and Problem

Twenty-odd separate files don't read as a system. An overview goes stale silently unless something checks it.

## Considered Options

- An overview plus an index by area, checked by a test
- An index only
- An overview only

## Decision Outcome

Chosen: an overview plus an index, because the test keeps it honest the way `check:generated` does for generated files. `docs/adr/README.md` holds a short system overview (current state and direction) and an index by area with kind and status. A test fails when the index misses an ADR, or when code or docs cite an `ADR-NNNN` that doesn't exist or is superseded.

## Consequences

- Good: the log can't drift from its index or its citations
- Bad: a new ADR also means updating the overview in the same PR
