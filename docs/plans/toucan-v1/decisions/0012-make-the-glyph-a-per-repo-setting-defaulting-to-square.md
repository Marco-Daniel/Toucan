# 0012. Make the glyph a per-repo setting, defaulting to square

- Status: Accepted
- Date: 2026-10-01
- Deciders: Marco

## Context and Problem

0005 left the status bar glyph shape open. After seeing the spike variants, a square looked best, but a distinct shape per repo adds a second cue next to color (useful when colors look alike, and for color-blind users).

## Considered Options

- Shape: **square default, settable per repo** / one fixed shape (bar, pill or square) / one global setting
- Set: **curated named list only** / curated list plus any codicon / only shapes from Toucan's own font
- Config: **`glyph` field on the repo object** / a separate `toucan.glyphs` map

## Decision Outcome

Chosen: **per-repo `glyph`, default `square`, from a curated, enum-validated list**: `square`, `bar`, `pill` (Toucan's font) and `circle`, `double-circle`, `heart`, `star`, `check-circle` (built-in codicons `circle-large-filled`, `record`, `heart-filled`, `star-full`, `pass-filled`). The string shorthand stays background-only with the default glyph. A new command, *Toucan: Set Glyph*, picks the glyph for the current repo through a quick pick with live preview.

The glyph is reused in the tooltip swatch, the sidebar block (drawn large in the middle) and the experimental search emoji (matching shape where an emoji exists, e.g. 🟥 square, 🔴 circle, ❤️ heart; fewer colors for non-square shapes). **Star uses squares in the emoji:** ⭐ only exists in yellow, so it would never carry the repo color, which is the emoji's whole purpose. A custom emoji isn't possible, because `window.title` is plain text. The status bar, tooltip and sidebar still show the star.

## Consequences

- Good: shape plus color distinguishes repos; validation in settings.json.
- Bad: codicon and font glyphs may differ slightly in size and weight; emoji color choice shrinks for some shapes.
- Follow-ups: decide the emoji fallback for glyphs without a matching emoji (e.g. bar, pill → square).
