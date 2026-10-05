# 0006. Offer an opt-in secondary sidebar color block

- Status: Superseded by [sidebar-explorer/0001](../../sidebar-explorer/decisions/0001-move-the-sidebar-block-into-the-explorer.md): the block moved from the secondary sidebar to the Explorer
- Date: 2026-10-01
- Deciders: Marco

## Context and Problem

Some users want a large, unmistakable color area in unfocused windows, like Kingfisher's sidebar panel. Kingfisher's implementation rearranges the layout (opens its view on blur, switches back to Explorer on focus) and users find the block hard on the eyes.

## Considered Options

- **Opt-in webview view in a `secondarySidebar` container**, revealed with `preserveFocus`, never switching other views
- **Kingfisher's toggle-on-blur behaviour**
- **Not offering a block at all**

## Decision Outcome

Chosen: **opt-in secondary sidebar webview**, off by default. `enableScripts: false`, strict CSP, body painted with the repo color.

## Consequences

- Good: very visible per-window signal for those who want it.
- Bad: takes a sidebar slot; width is user-controlled.
- Follow-ups: style and visibility settled in [0013](0013-make-the-sidebar-block-style-and-visibility-configurable.md).
