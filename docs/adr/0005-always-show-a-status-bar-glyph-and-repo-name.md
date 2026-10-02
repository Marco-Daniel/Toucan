# 0005. Always show a status bar glyph and repo name

- Status: Accepted
- Date: 2026-10-02
- Deciders: Marco
- Kind: constraint
- Area: statusBar
- Lifted by: [architecture-maintenance/0001](../plans/architecture-maintenance/decisions/0001-lift-system-shaping-decisions-into-a-repo-level-adr-log.md)

## Context and Problem

Only the focused window shows the Command Center color (ADR-0001). Every window with a configured repo, focused or not, still needs a mark of its repo that needs no settings writes.

Lifted from [toucan-v1/0005](../plans/toucan-v1/decisions/0005-always-show-a-status-bar-glyph-and-repo-name.md) and its 2026-10-02 amendment.

## Considered Options

- **A status bar item with Toucan's own icon font glyph**: any shape, colored by `StatusBarItem.color`.
- **Built-in codicons or Unicode only**: no filled square or bar codicon; Unicode blocks are small and font-dependent.
- **A status bar background**: not possible; only the error and warning theme colors are allowed.

## Decision Outcome

Chosen: **a status bar item in every window with a configured repo, with the repo's glyph from Toucan's icon font, plus the repo name**, colored with the repo color. The rules:

- Left-aligned at the highest priority, with a stable id, a `name` and an accessibility label.
- A markdown tooltip with an SVG swatch, the color and action links; a click opens Set Color.
- The glyph is the repo's own (toucan-v1/0012).
- No fallback in code: VS Code gives extensions no signal when a contributed icon font fails to load, so a failure can't be detected and swapped for another icon.

## Consequences

- Good: per window, works unfocused, stable API, no settings writes.
- Bad: only the glyph and text are colored, so a dark color on a dark status bar is hard to see; Toucan ships a small font.
- Follow-ups: picked colors are checked for contrast against the status bar (toucan-v1/0018).
