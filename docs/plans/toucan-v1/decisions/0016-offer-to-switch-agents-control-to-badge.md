# 0016. Offer once to switch Agents control to badge

- Status: Accepted
- Date: 2026-10-01
- Deciders: Marco

## Context and Problem

VS Code 1.139 defaults the experimental `chat.agentsControl.enabled` setting to `"compact"`. That mode replaces the classic Command Center with an agent-status pill whose CSS forces a transparent background. Toucan's `commandCenter.background` then doesn't show; only the border and text colors do. With `"badge"` (or `"hidden"`) the classic Command Center is back and fully colored, and `"badge"` keeps the agent badge. toucan-ab confirmed all three modes in an isolated instance with screenshots and computed styles.

This weakens 0002's main layer for anyone on the default, which very likely includes Marco.

## Considered Options

- **Offer once to switch to `"badge"`**, like the `window.title` consent (0015)
- Document it only: a README note and an output channel line when compact mode is detected
- Accept the border-and-text-only look in compact mode

## Decision Outcome

Chosen: **offer once**. When Toucan colors a window and `chat.agentsControl.enabled` is `"compact"` (or unset, so the compact default applies), it shows a one-time message: Toucan's color needs the classic search bar, so switch Agents control to badge? The buttons are *Switch* and *Not now*.

- *Switch* sets `chat.agentsControl.enabled` to `"badge"` in user settings.
- *Not now* records the answer in global state, and Toucan doesn't ask again.
- Toucan never changes the setting without asking, and never changes it back.

The README explains the setting and how to change it by hand. The output channel logs one info line when compact mode is detected after the user declined.

## Consequences

- Good: users on the default get the full Command Center color with one click, and nothing changes without consent.
- Bad: it relies on an experimental VS Code setting and the current CSS of the agent pill, so either can change in any release.
- Follow-ups: re-check the setting name and values when VS Code renames or stabilizes it.
