# 0004. Check the diff since the last run, with a full sweep on demand

- Status: Accepted
- Date: 2026-10-03
- Deciders: Marco

## Context and Problem

Checking only what changed is cheap but misses drift that already existed; checking every claim every time is thorough but costly.

## Considered Options

- Diff-driven only
- A full sweep every run
- Diff-driven by default, `--full` on demand

## Decision Outcome

Chosen: diff-driven by default: extract what changed since the tag (paths, renamed or removed files, `pnpm` scripts, config keys, commands, ADR statuses, notable symbols), find every mention in the docs (qmd plus a text search) and check it against the code. `--full` sweeps every doc claim; the first run, with no tag, sweeps automatically.

## Consequences

- Good: Cheap regular runs, with a way to catch older drift.
- Bad: Subtle behaviour changes the extraction misses wait for a full sweep.
