# 0005. Always show a status bar glyph and repo name

- Status: Accepted
- Date: 2026-10-01
- Deciders: Marco

## Context and Problem

With 0002, only the focused window shows the Command Center color. Every window, focused or not, still needs a per-window signal that needs no settings writes.

## Considered Options

- **Status bar item with Toucan's own icon font** — any glyph shape (bar, pill), colored by `StatusBarItem.color`
- **Built-in codicons / Unicode only** — no filled square or bar codicon; `circle-large-filled` is the best; Unicode blocks are small and font-dependent
- **Status bar background** — not possible: only error/warning theme colors are allowed

## Decision Outcome

Chosen: **always-on status bar item with a custom icon font glyph plus the repo name**, colored with the repo hex. Left-aligned at max priority (lands right after the remote indicator), stable id and `name`, accessibility label, markdown tooltip with an SVG swatch, hex and action links, click opens Set Color. `$(circle-large-filled)` is the fallback.

## Consequences

- Good: per-window, works unfocused, stable API, no settings writes.
- Bad: only the glyph/text is colored; dark colors on a dark status bar are hard to see; ships a small font.
- Follow-ups: glyph shape and font pipeline (commit `.woff` or generate from SVG); possible low-contrast warning.
