# 0007. Offer an experimental emoji in the Command Center label

- Status: Accepted
- Date: 2026-10-01
- Deciders: Marco

## Context and Problem

The user wanted a per-window color on or next to the search bar itself. Extensions cannot contribute anything to the title bar or Command Center. The spike showed that with a custom `window.title` containing `${activeRepositoryName}`, the Command Center label can show a colored emoji per window by setting the `scmActiveRepositoryName` context key.

## Considered Options

- **Emoji via `window.title` + context key, opt-in and experimental**
- **Title bar menu contributions** — not available to extensions
- **Leave the search bar alone** in unfocused windows

## Decision Outcome

Chosen: **opt-in, experimental emoji**. Toucan maps the repo hex to the nearest colored square emoji, asks consent for the one-time global `window.title` change, sets the key, and reasserts it after git/SCM, editor and focus events.

The key's value (revised during implementation, to avoid showing the repo name twice):

- When Toucan added `${activeRepositoryName}` to the title itself, it goes directly in front of the title (no separator), and the key holds the emoji plus a trailing space, e.g. "🟦 file.ts — webshop". For a repo without a color the value is empty, so VS Code drops the separator and no stray space or dash shows. The title already shows the folder name.
- When the user's own title already used `${activeRepositoryName}`, the key holds emoji + repo name, since that title expects the name there.
- After Clear Color: empty when Toucan added the variable (the title already shows the name); otherwise Toucan hands the key back (the folder name if git has a repository open, else empty).
- Feature turned off: Toucan hands the key back.

## Consequences

- Good: the search box itself is marked in every window.
- Bad: relies on an undocumented internal key (may break in any release); brief flicker when SCM rewrites it; only ~9 colors; emoji also appears in the OS window title.
- Follow-ups: the consent flow is settled in [0015](0015-ask-before-changing-window-title.md).

## Amendment (2026-10-03)

With no editor open, the label read "🟦 — webshop": the emoji in front kept VS Code's separator alive, because VS Code only drops a separator with nothing on one side. Toucan now registers its own title variable, `${toucanRepoEmoji}` (VS Code's `registerWindowTitleVariable` command, backed by Toucan's context key `toucan.repoEmoji`), and puts it directly in front of the first `${rootName}` when it writes `window.title`. The emoji goes in exactly one of the two places:

- An editor is open: in `${activeRepositoryName}`, so "🟦 file.ts — webshop" as before.
- No editor is open: in `${toucanRepoEmoji}`, with `${activeRepositoryName}` empty, so VS Code drops the separator: "🟦 webshop".

A title written before this change, without the slot, gets it added in the focused window without asking again (the user consented to Toucan's title); restore accepts the title with or without the slot. A title without `${rootName}`, and the user's own title that already uses `${activeRepositoryName}`, keep the earlier behaviour.

