# 0001. Store colors in user settings keyed by folder name

- Status: Accepted
- Date: 2026-10-01
- Deciders: Marco

## Context and Problem

Toucan needs to know which color belongs to which repo, without writing anything into the repo. A simple map in user settings keyed by workspace folder name is a proven pattern for this.

## Considered Options

- **Folder name map in user settings** — `toucan.repos: { "<folder>": color | { background, … } }`
- **Git remote repo name** — survives renamed folders and worktrees, but async, needs the git API, nothing for non-git folders
- **Remote name with folder fallback** — most robust, most code
- **Two flat maps** (`toucan.background`, `toucan.foreground`) — mirrors a flat key-per-property layout exactly

## Decision Outcome

Chosen: **folder name map**, with each value either a color string (background, rest derived) or an object with a required `background` and optional overrides. Simple, synchronous, familiar pattern.

## Consequences

- Good: zero repo footprint; editable by hand; one setting.
- Bad: a clone or worktree under another directory name needs its own entry.
- Follow-ups: JSON schema for the value shape so settings.json shows validation.
