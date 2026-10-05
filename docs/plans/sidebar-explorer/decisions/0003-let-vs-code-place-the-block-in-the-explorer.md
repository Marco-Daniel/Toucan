# 0003. Let VS Code place the block in the Explorer

- Status: Accepted
- Date: 2026-10-05
- Deciders: Marco

## Context and Problem

Marco's screenshot shows the block at the top of the Explorer, above the folder tree. The views contribution has no supported way to put an extension view above the Explorer's built-in sections.

## Considered Options

- **Accept VS Code's default placement; document dragging it**
- Move it at runtime with internal commands

## Decision Outcome

Chosen: **VS Code places it**, most likely below the folder tree. Dragging it to the top sticks, per view id. No internal commands (stable API only, GROUNDING).

## Consequences

- Good: stable API only; the user's own arrangement wins.
- Bad: the default may sit low in a crowded Explorer; Marco judges it on the test screenshots (0004).
