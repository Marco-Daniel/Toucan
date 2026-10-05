# 0006. Hide the block through its when clause; only a Hide closes it

- Status: Accepted
- Date: 2026-10-05
- Deciders: Marco, the lead
- Amended by [0007](0007-let-the-manifest-open-the-block-and-use-a-new-key.md): the reveal and the remembered key changed after review round 1; everything about hiding and Toggle stands.
- Supersedes: the "what counts as closing" and Toggle parts of [toucan-v1/0013](../../toucan-v1/decisions/0013-make-the-sidebar-block-style-and-visibility-configurable.md)

## Context and Problem

In the secondary sidebar, Toucan closed the bar and counted "the block stopped being visible while the window was focused" as the user closing it. In the Explorer that no longer works, and the first task of this plan was to measure why. The finding, from an isolated VS Code 1.138 driven over DevTools with a throwaway extension that contributes a webview view to `views.explorer` and logs `onDidChangeVisibility`, `onDidDispose` and resolves (two runs):

| User action | What the extension sees |
| --- | --- |
| The view first appears (never opened) | Collapsed and not resolved: no resolve, no event |
| `<viewId>.focus` with `preserveFocus` on it | Expanded and resolved, `visible=true` |
| Collapse (click the header) | `onDidChangeVisibility`, `visible=false`; expand gives `true` |
| Hide the whole primary sidebar, view expanded | `visible=false`; showing it again `true` |
| Another primary view (Search, Source Control), view expanded | `visible=false`; back to the Explorer `true` |
| **Hide** from the view's "…" menu, expanded | **No visibility event; `onDidDispose`** (visible was still `true`). Stays hidden after a reload. |
| The `when` context key goes false, expanded | The same: `onDidDispose`, no visibility event |
| The key goes true again | Resolved again at once, expanded, `visible=true` |
| `.focus` on a view the user hid | Shown again, expanded and resolved |
| `.focus` on a view the user collapsed | Expanded again |
| Collapsed, then window reload | Still collapsed afterwards; expanded and hidden also persist |
| Window reload | No dispose and no visibility event before it |

Collapsing, hiding the sidebar and showing another view all look the same (`visible=false`), and all of them are normal ways to use the Explorer, not closes. Only a Hide produces something different, a dispose. But a dispose isn't always a Hide: VS Code can resolve a view again after it is moved (the adapter's own comment says "after a close, a move").

## Considered Options

- **Context key in the `when` clause, fed from the remembered state; a dispose counts as a Hide only if the view isn't resolved again shortly after; reveal once per workspace**
- Keep treating `visible=false` as a close (wrong for collapse, other views and a hidden sidebar)
- Call the internal `<viewId>.removeView` command to hide the view (not stable API)
- Reveal on every startup (re-expands a block the user collapsed)

## Decision Outcome

Chosen: the first option.

- **Manifest `when`:** `toucan.sidebarBlockAvailable && toucan.sidebarBlockShown`. Available means the setting is on and the repo has a color, as before; shown means not remembered closed in this workspace.
- **A close** is one of two things: **Toggle Sidebar Block** hiding it, or the user's **Hide** from the Explorer's "…" menu. Every `visible=false` is ignored: collapse, another view and a hidden sidebar aren't closes.
- **Detecting a Hide:** `onDidDispose` while the shown key is still true and Toucan didn't cause it. Toucan doesn't write the flag at once; it starts a short timer (the old remember delay), and writes the closed flag only if the view hasn't been resolved again by then. Dispose of the controller cancels the timer, so a reload or shutdown never records a close. Same workspaceState key as before, so no migration.
- **Toggle Sidebar Block:**
  - **Shown** (resolved and visible): hide it. Write the closed flag and set the shown key to false.
  - **Hidden, or collapsed:** show it. Clear the flag, set the key to true and run `.focus` with `preserveFocus`, which expands it. A collapsed block is "show", not "hide": the command reveals and expands it.
  - Setting off: the command still offers to turn it on.
- **Reveal** happens when the block becomes available: the setting turned on, the repo getting a color, and the first start after the upgrade. It doesn't happen on every startup, because VS Code remembers collapse, hide and position per workspace, and `.focus` would re-expand a collapsed block. Toucan remembers the reveal per workspace (a second workspaceState flag). A block the user collapsed is never re-expanded by Toucan; Toggle (show) always reveals.
- No internal workbench commands: the key is the supported way to hide a view.

## Consequences

- Good: collapse, other views and hiding the sidebar never count as a close; one documented mechanism (the context key) for hiding; no migration.
- Good: a block the user hid or collapsed stays that way across restarts.
- Bad: a hidden block is gone from the Explorer's "…" menu (the key hides it); the way back is Toggle Sidebar Block.
- Bad: the dispose timer is a heuristic. The test run must show: a drag within the Explorer, a drag to the secondary sidebar and back, and an extension host restart, disable and enable don't close it; Hide from the "…" menu does.
- Cursor and other editors that reserve the secondary sidebar no longer matter for the block (ADR-0016 gets a pointer).
