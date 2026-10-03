# 0002. Capture the README screenshots with a script

- Status: Accepted
- Date: 2026-10-03
- Deciders: Marco

## Context and Problem

Screenshots go stale silently whenever the UI changes.

## Considered Options

- Screenshots taken by a script, re-runnable
- One-off screenshots taken by hand
- GIFs or clips for every flow

## Decision Outcome

Chosen: a script (e.g. `pnpm screenshots`) that starts an isolated VS Code with a demo setup (several repos with different colors and glyphs), drives it, and writes the images to `media/readme/`. A UI change means re-running the script, which fits the docs-sync rule.

## Consequences

- Good: Images stay true to the real extension and are cheap to refresh.
- Bad: The script needs maintaining alongside the UI.
