# 0026. Write naming conventions into CLAUDE.md

- Status: Accepted
- Date: 2026-10-02
- Deciders: Marco

## Context and Problem

oxlint can't enforce naming conventions.

## Considered Options

- Write them down
- Leave them as standard practice

## Decision Outcome

Chosen: write them down: functions are verbs, booleans read as `is`/`has` questions, constants are `UPPER_SNAKE`, types are PascalCase with `…Args` for object arguments, and file names are camelCase with a role suffix.

## Consequences

- Good: consistent names across agents
- Bad: a few more CLAUDE.md lines
