# 0004. Draw glyphs polygonal with softened corners

- Status: Accepted
- Date: 2026-10-02
- Deciders: Marco

## Context and Problem

The glyphs need one style that matches the angular logo and the app icon, reads at 12 to 16px, and works in a single color. The first drafts were sharp-cornered polygons. Marco asked for them to be "a bit rounder, keep the polygonal style, but a bit more smooth".

## Considered Options

- **Sharp polygons**: matches the logo exactly, but looks spiky and harsh at small sizes.
- **Polygonal with softened corners**: the same polygons, with corners rounded by a 1.5-unit round join on the 16 grid.
- **Fully rounded or curved shapes**: closer to codicons, but it loses the logo's character.

## Decision Outcome

Chosen: **polygonal with softened corners**, because it keeps the logo's faceted look and reads smoother at status bar size. The rules:

- Filled shapes in a single color (the repo color).
- 16-unit height. Round shapes are 14-gons.
- Corner softening R = 1.5. Holes (eyes, windows) get a lighter softening (R × 0.45), so they stay open.
- Holes are cut out, never drawn in a second color.
- The sun's rays are the exception: a sharper 0.7, so the tips stay pointy (0006).

## Consequences

- Good: one recognizable family; it matches the extension icon.
- Bad: the rounding must be baked into path geometry for the font (strokes don't survive conversion). That's more work than drawing with a stroke.
- Follow-ups: the reference geometry is in `assets/glyph-sheet.py`.
