# 0008. Clear Toucan's keys for unconfigured repos

- Status: Accepted
- Date: 2026-10-01
- Deciders: Marco

## Context and Problem

Because colors are written in user scope (0002), a window for a repo without an entry would otherwise keep the previous repo's Command Center color.

## Considered Options

- **Clear Toucan's keys** — theme default, no indicator
- **Automatic color from a hash of the repo name**

## Decision Outcome

Chosen: **clear Toucan's keys**, so unconfigured repos look exactly like plain VS Code.

## Consequences

- Good: no surprising colors; explicit opt-in per repo.
- Bad: each repo needs one setup action.
