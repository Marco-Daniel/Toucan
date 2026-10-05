# 0002. Drop the unfocused visibility mode

- Status: Accepted
- Date: 2026-10-05
- Deciders: Marco
- Supersedes: the visibility part of [toucan-v1/0013](../../toucan-v1/decisions/0013-make-the-sidebar-block-style-and-visibility-configurable.md)

## Context and Problem

`unfocused` mode reveals the block on blur and closes the secondary sidebar on focus, if Toucan opened it. In the Explorer the equivalent would hide the user's primary sidebar or switch it away from Search or Source Control on every focus change: the layout churn toucan-v1/0006 rejected.

## Considered Options

- **Drop the mode; every block behaves as `always`**
- Keep it, revealing the Explorer with the block on blur
- Keep it, collapsing and expanding the view instead

## Decision Outcome

Chosen: **drop it**. `toucan.sidebarBlock.visibility` and the per-repo `visibility` field stay in the manifest for now with a deprecation message and are ignored. The style setting (`full`/`muted`) and the remembered close per workspace stay.

## Consequences

- Good: simpler controller, no focus-driven layout changes at all.
- Bad: anyone who chose `unfocused` loses it; the deprecation message says so.
- Follow-up: remove the deprecated settings from the manifest in a later release; the README, site docs and setting descriptions drop the mode in this one.
