# 0002. Style with Tailwind, with the icon's colors as theme tokens

- Status: Accepted
- Date: 2026-10-03
- Deciders: Marco

## Context and Problem

The site needs a styling approach that keeps the design consistent across landing, docs and changelog pages.

## Considered Options

- **Tailwind** with a theme built from the icon's colors
- Plain CSS modules
- A component library

## Decision Outcome

Chosen: **Tailwind**, as Marco asked. The theme tokens come from the icon and the presets: plumage black `#101316`, cream `#f6efdc`, bill amber `#faa404`, beak orange `#e0620b`, jungle green `#56915e` and the 16 presets, taken from `@toucan/brand` (0009) rather than retyped.

## Consequences

- Good: one set of tokens for every page; the palette has a single source.
- Bad: Tailwind class lists in the markup; the theme must stay in step with the brand package.
