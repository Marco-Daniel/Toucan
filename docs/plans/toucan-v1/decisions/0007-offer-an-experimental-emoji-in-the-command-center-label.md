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

Two problems with the context key: with no editor open the label read "🟦 — webshop" (the emoji in front kept VS Code's separator alive, since VS Code only drops a separator with nothing on one side), and after an uninstall or with Toucan disabled, the `${activeRepositoryName}` Toucan left in `window.title` was filled by source control again, so the title read "webshop — webshop" until the user removed it.

Toucan now uses only window title variables of its own, registered per window through VS Code's `registerWindowTitleVariable` command (internal, so still only in this opt-in experimental feature, ADR-0003) and backed by Toucan's context keys: `${toucanRepoLead}` in front of the title and `${toucanRepoEmoji}` directly in front of the first `${rootName}`. The emoji goes in exactly one of them:

- An editor is open: in front, "🟦 file.ts — webshop".
- No editor is open: in front of the folder name, so VS Code drops the separator: "🟦 webshop".
- No color: both empty.

A variable nobody registers renders empty, so a title left behind by an uninstall or a disabled Toucan shows no emoji and no repeated name (the Command Center then shows the title, e.g. "README.md — webshop", as with any custom `window.title`), and nothing needs restoring. If registering fails, the emoji doesn't show and Toucan says so once. Toucan no longer overwrites `scmActiveRepositoryName`, so there is no flicker when source control rewrites it, and no git watching.

Titles written by earlier versions (with `${activeRepositoryName}` in front, with or without the slot) move to the new form in the focused window without asking again, while the title is still what Toucan wrote; restore accepts every form Toucan wrote. A user whose own title used `${activeRepositoryName}` (where Toucan used to show the emoji and name without changing the title) gets source control's plain name there again, and is asked whether Toucan may add its own variable in front.
