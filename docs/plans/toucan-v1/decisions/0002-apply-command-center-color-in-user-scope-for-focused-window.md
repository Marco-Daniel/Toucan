# 0002. Apply the Command Center color in user scope for the focused window

- Status: Accepted
- Date: 2026-10-01
- Deciders: Marco

## Context and Problem

VS Code only renders workbench colors from `workbench.colorCustomizations`. User scope is shared by every window; per-window values only come from workspace settings, which means a file in the repo (`.vscode/settings.json`) or a `.code-workspace` file. There is no in-memory or per-window API (microsoft/vscode#43226, closed as not planned).

## Considered Options

- **Workspace `.vscode/settings.json`** (Peacock) — true per-window, but writes into the repo
- **Toucan-managed `.code-workspace` outside the repo + automatic reopen** — true per-window, but a reload on first open and a "(Workspace)" title suffix
- **Modifying the VS Code installation** — unsupported, breaks on updates, not publishable
- **User scope, focused window only, with focus guards** (Kingfisher-like, but race-safe)

## Decision Outcome

Chosen: **user scope for the focused window**, because it keeps the repo untouched and uses only stable API. Unfocused windows are identified by the status bar indicator (0005) and the opt-ins (0006, 0007).

Focus guards: react only to real `focused` transitions (ignore `active`), write on focus only when values differ, debounce blur and clear only when this window's owner marker is still current, clean up after crashed windows on startup, clear on `deactivate`.

## Consequences

- Good: no repo files, no reload, publishable.
- Bad: unfocused windows lose the Command Center color; user settings.json is rewritten on window switches.
- Follow-ups: owner marker storage (own setting or globalState) is for the implementer.
