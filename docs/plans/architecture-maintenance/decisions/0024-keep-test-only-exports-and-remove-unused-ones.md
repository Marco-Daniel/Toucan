# 0024. Keep test-only exports, and remove unused ones

- Status: Accepted
- Date: 2026-10-02
- Deciders: Marco

## Context and Problem

The audit found exports used only by tests, and some used by nothing.

## Considered Options

- Remove test-only exports and test through public functions
- Keep them exported for testing
- Case by case

## Decision Outcome

Chosen: keep exports that only tests use, as an accepted pattern. Exports with no users at all are removed (or un-exported when the file itself uses them).

## Consequences

- Good: tests can pin small units directly
- Bad: a few exports exist only for tests
