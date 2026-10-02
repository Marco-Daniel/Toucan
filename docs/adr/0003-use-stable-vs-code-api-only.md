# 0003. Use stable VS Code API only, internals opt-in and experimental

- Status: Accepted
- Date: 2026-10-02
- Deciders: Marco
- Kind: constraint
- Area: all
- Lifted by: [architecture-maintenance/0001](../plans/architecture-maintenance/decisions/0001-lift-system-shaping-decisions-into-a-repo-level-adr-log.md)

## Context and Problem

Toucan should keep working across VS Code releases and stay publishable on the Marketplace. Some of what it wants to show (a per-window mark in the Command Center label itself) is only reachable through undocumented behavior that can break in any release.

From GROUNDING.md's conventions and the toucan-v1 plan, where the stable API is the reason for choosing user scope ([toucan-v1/0002](../plans/toucan-v1/decisions/0002-apply-command-center-color-in-user-scope-for-focused-window.md)) and the status bar item ([toucan-v1/0005](../plans/toucan-v1/decisions/0005-always-show-a-status-bar-glyph-and-repo-name.md)), and where the one internal feature is framed as opt-in and experimental ([toucan-v1/0007](../plans/toucan-v1/decisions/0007-offer-an-experimental-emoji-in-the-command-center-label.md)).

## Considered Options

- **Stable API only, internals opt-in and experimental**: the default experience never depends on internals.
- **Proposed APIs**: more reach, but not usable in a published extension.
- **Internal behavior on by default**: the best-looking result, until a release breaks it for everyone.

## Decision Outcome

Chosen: **stable API only by default**. The rules:

- No proposed APIs.
- Anything relying on internal behavior (today: the search emoji, which sets the internal `scmActiveRepositoryName` context key) is off by default, opt-in, and labelled experimental in its setting and the README.

## Consequences

- Good: the default features survive VS Code updates; Toucan stays publishable.
- Bad: some ideas stay out of reach (a colored title bar per window, a status bar background); the experimental feature may break in any release.
