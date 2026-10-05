# 0004. Test in an isolated VS Code before the version

- Status: Accepted
- Date: 2026-10-05
- Deciders: Marco

## Context and Problem

The move changes how the block shows, hides and survives reloads, in ways unit tests with fakes can't prove: VS Code decides placement, visibility events and restored layouts. Marco: "this needs proper testing in VS Code as well before we make the version".

## Considered Options

- **An isolated VS Code run with screenshots for Marco, as a gate before the bump PR**
- Unit tests only, and a smoke test after the release

## Decision Outcome

Chosen: **an isolated VS Code test before the version.** It covers turning the block on, where it lands, dragging it, hiding it and reloading, Toggle Sidebar Block both ways, a repo without a color, and an upgrade from 1.0.0 with the block open in the secondary sidebar. The implementer first records the visibility events (plan, Approach), then tests the build. Marco's OK on the screenshots comes before the bump PR.

## Consequences

- Good: Marco sees the real behaviour before anything reaches the store, where a release can't be withdrawn.
- Bad: the test needs Marco's machine unlocked and idle.
