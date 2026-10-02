# 0002. Curate sixteen glyphs in four themed groups

- Status: Accepted
- Date: 2026-10-02
- Deciders: Marco

## Context and Problem

The glyph serves two purposes "both, equally": telling repos apart at a glance next to color, and personality. Too few glyphs and repos share shapes; too many and the Set Glyph list turns into an icon browser, and each extra shape has to hold up at 16px.

## Considered Options

- **About 12**: a tight set.
- **16 in four groups of four**: Shapes, Toucan's world, Characters, Fun & dev.
- **20 or more**: also flame, paw, crown, gem, other suns.

## Decision Outcome

Chosen: **16 in four groups of four**. It started from "about 12", and Marco said "let's try to push to 16". The groups give the list a clear order and show it in Set Glyph:

- Shapes: square, bar, pill, circle
- Toucan's world: toucan, sun, leaf, moon
- Characters: alien, ghost, robot, cat
- Fun & dev: bolt, heart, star, rocket

## Consequences

- Good: enough variety to give most repos in a workspace their own shape; the groups make the quick pick easy to scan.
- Bad: the characters (alien, ghost, robot, cat) are the most detailed and the hardest to read at 16px.
- Follow-ups: add separators per group in Set Glyph (see plan.md).
