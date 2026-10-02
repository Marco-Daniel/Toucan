# 0002. Mark the last run with a git tag

- Status: Accepted
- Date: 2026-10-03
- Deciders: Marco

## Context and Problem

"Everything changed since the last run" needs a stored starting point.

## Considered Options

- A git tag `docs-sync/last`
- A committed marker file with the commit hash
- No stored state: pass a range each time

## Decision Outcome

Chosen: a git tag, `docs-sync/last`, moved to the commit a run covered once that run's fixes have merged, and pushed so every clone sees it.

## Consequences

- Good: Invisible in the files; one command to read.
- Bad: A tag that isn't pushed is lost; the skill must push it.
