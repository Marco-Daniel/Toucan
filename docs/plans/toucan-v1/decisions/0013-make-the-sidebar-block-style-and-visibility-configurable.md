# 0013. Make the sidebar block style and visibility configurable

- Status: Partly superseded: the visibility modes by [sidebar-explorer/0002](../../sidebar-explorer/decisions/0002-drop-the-unfocused-visibility-mode.md), and what counts as a close and Toggle Sidebar Block by [sidebar-explorer/0006](../../sidebar-explorer/decisions/0006-hide-the-block-through-its-when-clause.md). The `full`/`muted` style stands.
- Date: 2026-10-01
- Deciders: Marco

## Context and Problem

0006 made the secondary sidebar block opt-in but left open how it looks and when it shows. A full-color block is the most recognizable but Kingfisher users find it hard on the eyes. Showing it only in unfocused windows (Kingfisher's way) keeps it out of the way while you work, but means revealing and hiding a view on focus changes.

## Considered Options

- Style: full color with a large glyph / muted fill (~25% alpha) with a full-color glyph / **configurable, default full**
- Visibility: always while enabled / only when unfocused / **configurable, default always, overridable per repo**

## Decision Outcome

Chosen:

- **Style is a setting: `full` (default) or `muted`.**
  - `full`: solid repo color, the glyph large in the middle in the derived foreground, repo name underneath.
  - `muted`: background at about 25% alpha over the theme, glyph and name in full color.
- **Visibility is a setting: `always` (default) or `unfocused` (Kingfisher style).**
  - `always`: revealed on startup with `preserveFocus: true`. You can close or resize it like any view, and focus changes never toggle it. **Once you close it, it stays closed**, also after a restart, until you open it again. Toucan remembers this per workspace (workspace state), so closing it in one repo doesn't hide it in others.
  - **What counts as closing:** Toucan's view stops being visible while the window is focused, and Toucan didn't cause it. That includes closing the secondary sidebar and switching it to another view such as Chat. Toucan's own closes (in `unfocused` mode) and window reloads or shutdowns don't count. VS Code itself restores the secondary sidebar's open state and active view per workspace, so the flag only stops Toucan's own reveal on startup; Toucan never closes the bar on startup.
  - `unfocused`: revealed on blur. On focus, the secondary sidebar is closed again only if Toucan opened it; if it was already open, Toucan leaves it alone.
- **Visibility has a general setting for all repos, and each repo can override it** with a field on its `toucan.repos` entry.
- **Command *Toucan: Toggle Sidebar Block*** opens or closes the block in the current window. Opening it clears the remembered "closed" state. If the block setting is off, the command offers to turn it on.

The block itself stays opt-in (0006).

## Consequences

- Good: everyone picks how loud the block is, and the Kingfisher behavior is there for those who want it.
- Bad: `unfocused` brings back some of the layout churn 0006 avoided. It must still use `preserveFocus` and must never switch other views (no Explorer toggling).
- Bad: Toucan can't detect another view (such as Chat) already open in the secondary sidebar (see the spike in context.md). In `unfocused` mode Toucan then replaces it on blur and closes the sidebar on focus. Accepted for v1 because the mode is an opt-in. The setting description warns about it, and `always` mode isn't affected.
