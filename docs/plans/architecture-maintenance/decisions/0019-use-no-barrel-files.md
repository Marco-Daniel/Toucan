# 0019. Use no barrel files

- Status: Accepted
- Date: 2026-10-02
- Deciders: Marco

## Context and Problem

A common pattern is an index.ts barrel per folder.

## Considered Options

- A barrel per feature
- No barrels; imports name the file

## Decision Outcome

Chosen: no barrels, by preference. Imports point straight at the defining file with explicit `.ts` paths. A guard test fails on any `export … from` re-export in `src/`.

## Consequences

- Good: no hidden import cycles or over-loading
- Bad: a feature's public surface isn't written down in one place
