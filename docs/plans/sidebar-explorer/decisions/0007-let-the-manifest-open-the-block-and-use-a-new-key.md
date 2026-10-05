# 0007. Let the manifest open the block, and remember a hide under a new key

- Status: Accepted
- Date: 2026-10-05
- Deciders: Marco, the lead
- Supersedes: the reveal part of [0006](0006-hide-the-block-through-its-when-clause.md), and its "same key, no migration" line

## Context and Problem

Round 1 of the review found two problems in 0006.

1. **The reveal switched views.** 0006 had Toucan run `<viewId>.focus` once per workspace to expand the new block. `.focus` shows the view's container, so with Search or Source Control open in the primary sidebar it switches to the Explorer: the very layout churn toucan-v1/0006 and 0002 rule out.
2. **An old close carried over.** 0006 kept the workspaceState key `sidebarBlock.closed`. In 1.0.0 that flag was also written when the user switched the secondary sidebar to another view (Chat, say). A user who did that would find the block hidden in the Explorer after the upgrade, with no sign why.

## Considered Options

- **`"visibility": "visible"` on the view in the manifest, no reveal of Toucan's own; a new key `sidebarBlock.hidden`; only Toggle (show) runs `.focus`**
- Keep the one-time `.focus` reveal and only guard it when another view is open (Toucan can't tell reliably which view the primary sidebar shows)
- Keep the old key and clear it on upgrade (needs a version marker, and the old value can't be told from a real hide)

## Decision Outcome

Chosen: the first option.

- The view contribution gets `"visibility": "visible"`, so VS Code shows it expanded where it first appears: at startup, when the setting goes on, when the repo gets a color. Toucan never reveals it by itself, so it never switches a primary sidebar view. VS Code keeps collapse, hide and position per workspace afterwards.
- The remembered hide is the workspaceState key **`sidebarBlock.hidden`**. 1.0.0's `sidebarBlock.closed` is left alone and ignored, so an old close doesn't hide the block after the upgrade. Nothing else about hiding changes (0006): a dispose with the shown key still true, after the delay, or Toggle.
- **Toggle Sidebar Block (show)** still runs `.focus` with `preserveFocus`: it's an explicit request, and it expands a collapsed block. The "revealed" flag and every other automatic reveal are gone.

## Consequences

- Good: no automatic view switching at all; one less flag; the upgrade starts clean.
- Bad: a user who really had hidden the block in 1.0.0 sees it once in the Explorer and has to hide it again.
- The isolated VS Code test covers: a fresh profile with the setting on, the setting turned on mid-session, and Search open throughout (the primary view must stay Search); an upgrade from 1.0.0 whose old `closed` flag is set.
