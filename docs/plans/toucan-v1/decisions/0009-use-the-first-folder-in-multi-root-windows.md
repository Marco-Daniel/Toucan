# 0009. Use the first folder in multi-root windows

- Status: Accepted
- Date: 2026-10-01
- Deciders: Marco

## Context and Problem

Colors apply per window, so a multi-root window can show only one color at a time. The user floated following the active repo, or even transitions.

## Considered Options

- **First (main) folder** — the folder opened first in the session
- **Follow the active editor's folder** — instant switch, more writes
- **No multi-root support in v1**

## Decision Outcome

Chosen: **first folder** for v1. Animated transitions are not possible (VS Code repaints instantly) and are out of scope.

## Consequences

- Good: simple and predictable.
- Bad: other folders in the window are not distinguished.
- Follow-ups: revisit following the active editor after v1.
