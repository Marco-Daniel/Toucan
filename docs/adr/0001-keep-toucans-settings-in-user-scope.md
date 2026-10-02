# 0001. Keep Toucan's settings in user scope, never in the repo

- Status: Accepted
- Date: 2026-10-02
- Deciders: Marco
- Kind: constraint
- Area: settings
- Lifted by: [architecture-maintenance/0001](../plans/architecture-maintenance/decisions/0001-lift-system-shaping-decisions-into-a-repo-level-adr-log.md)

## Context and Problem

Toucan colors a repository without the repository knowing: nothing it writes may land in the repo, a `.vscode/settings.json` or a `.code-workspace` file. It still needs to remember a color per repo, and VS Code only renders workbench colors from `workbench.colorCustomizations`, which per window only exists in workspace settings.

Lifted from [toucan-v1/0001](../plans/toucan-v1/decisions/0001-store-colors-in-user-settings-keyed-by-folder-name.md); the same choice for the colors it writes is [toucan-v1/0002](../plans/toucan-v1/decisions/0002-apply-command-center-color-in-user-scope-for-focused-window.md).

## Considered Options

- **User settings only**: `toucan.repos` keyed by workspace folder name, and the focused window's colors in the user-level `workbench.colorCustomizations`.
- **Workspace settings** (`.vscode/settings.json`, as Peacock does): truly per window, but writes into the repo.
- **A Toucan-managed `.code-workspace` outside the repo**: per window, but needs a reload and adds a "(Workspace)" title suffix.
- **Keying by git remote**: survives renamed folders and worktrees, but is async, needs the git API and has nothing for non-git folders.

## Decision Outcome

Chosen: **user settings only**. The rules:

- `toucan.repos` is an application-scoped user setting, keyed by workspace folder name. A value is a color string (the Command Center background, the rest derived) or an object with a required `background`, optional color overrides and a `glyph`.
- The Command Center colors go into the user-level `workbench.colorCustomizations`, written by the focused window only.
- Toucan never writes a file in the repository or a workspace settings file.

## Consequences

- Good: zero repo footprint; the settings are editable by hand.
- Bad: a clone or worktree under another folder name needs its own entry; unfocused windows don't show the Command Center color.
- Follow-ups: the writes keep comments when they safely can (toucan-v1/0017).
