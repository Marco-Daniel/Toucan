# 0005. Remove the identity check now

- Status: Accepted
- Date: 2026-10-04
- Deciders: Marco

## Context and Problem

The temporary identity-check workflow and `main` in the `marketplace` environment existed only to set up Azure.

## Considered Options

- **Delete the workflow and the main policy now**
- Keep them for a future Azure setup

## Decision Outcome

Chosen: **delete both now**. DevOps removed the main policy on 2026-10-04, so the environment allows `v*` tags only. The workflow goes in this plan's PR; git history keeps it if Azure is ever set up.

## Consequences

- Good: nothing unused can reach the environment.
- Bad: a future Azure setup restores it from history.
