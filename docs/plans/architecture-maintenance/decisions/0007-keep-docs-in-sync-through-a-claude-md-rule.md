# 0007. Keep docs in sync through a CLAUDE.md rule

- Status: Accepted
- Date: 2026-10-02
- Deciders: Marco

## Context and Problem

Docs drift whenever the code changes; during this run, paths drifted after the file moves and were caught only by reviewers searching by hand.

## Considered Options

- A CLAUDE.md rule only
- An automated test for dead references
- Both

## Decision Outcome

Chosen: a rule only: a PR that changes a command, a path or a behaviour updates every doc that mentions it, in the same PR. A periodic docs lint, cleanup and sync skill is on the backlog as issue #6, as the backstop.

## Consequences

- Good: covers untrue descriptions as well as dead references
- Bad: relies on someone noticing until the skill exists
- Follow-ups: brainstorm and build the skill (issue #6)
