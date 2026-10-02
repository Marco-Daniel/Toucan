# 0009. Allow no lint warnings

- Status: Accepted
- Date: 2026-10-02
- Deciders: Marco

## Context and Problem

CI ran `oxlint` without `--deny-warnings`, so in one review round two new warnings passed a green CI and only a reviewer caught them.

## Considered Options

- No warnings: every rule is error or off
- Warnings fail CI
- Warnings as soft hints or staging

## Decision Outcome

Chosen: no warnings: every rule is error or off. The `lint` script runs `oxlint --type-aware --deny-warnings --report-unused-disable-directives`, identical locally and in CI.

## Consequences

- Good: lint is binary: green means clean
- Bad: a new rule can't be staged as a warning (see 0012)
