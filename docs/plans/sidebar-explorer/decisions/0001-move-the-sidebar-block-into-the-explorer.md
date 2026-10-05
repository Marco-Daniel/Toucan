# 0001. Move the sidebar block into the Explorer

- Status: Accepted
- Date: 2026-10-05
- Deciders: Marco
- Supersedes: [toucan-v1/0006](../../toucan-v1/decisions/0006-offer-an-opt-in-secondary-sidebar-color-block.md)

## Context and Problem

The opt-in block lives in a container in the secondary sidebar. There it competes with Chat and other agent views, the bar is often closed, and in `always` mode Toucan never opens it, so turning the block on can look like nothing happened. Marco dragged the block into the Explorer himself and preferred it there: always in view at the top of the primary sidebar. Cursor also reserves the secondary sidebar (ADR-0016).

## Considered Options

- **Contribute the view to the built-in Explorer (`views.explorer`)**
- An own view container in the Activity Bar (a new icon in the primary sidebar)
- Keep the secondary sidebar container

## Decision Outcome

Chosen: **the Explorer**, with the same view id `toucan.block`, so a block a user moved stays where they put it. The secondary sidebar container is removed. Users can still drag the block anywhere, the secondary sidebar included. The block stays opt-in, scriptless and never switches other views (as in toucan-v1/0006).

## Consequences

- Good: the block is visible without opening a second bar, and doesn't compete with Chat; no new icon.
- Good: it no longer depends on the secondary sidebar, which Cursor reserves.
- Bad: it's only visible while the Explorer is the active primary sidebar view.
- Bad: "close" can no longer mean closing a bar; the close design is reworked (plan, Approach).
