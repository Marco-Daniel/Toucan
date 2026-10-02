# 0006. Draw the sun with eight separate pointy rays

- Status: Accepted
- Date: 2026-10-02
- Deciders: Marco

## Context and Problem

Marco asked for "a spiky sun kinda logo". The candidates were a spiky star-shaped sun, a curled seven-ray sun, and suns with rays separate from the disc. At 16px, rays that touch the disc merge into a blob or a ring.

## Considered Options

- **Spiky outline sun** (rays and disc as one shape).
- **Curled sun** (sun-curl-7): the rays twist around the disc.
- **Separate straight rays**: 8, 9 or 10, at different widths (sun-pins-8, 8b, 9, 10).

## Decision Outcome

Chosen: **sun-pins-8**: a disc (radius 2.8, 12-gon) with eight separate straight triangle rays from radius 5.0 to 7.9, each with a half-width of 0.2, drawn with the sharper 0.7 softening. Marco wanted the rays separate from the disc, with no twisting, and then "like sun pins 8, but more pointy". After comparing it with 9, he settled on 8. The setting value is `sun`.

## Consequences

- Good: it reads as a sun with clear, pointy rays, even at status bar size.
- Bad: the thin rays are the most fragile detail in the set at low DPI.
- Follow-ups: sun-curl-7 was liked too, but didn't make the 16. It's in `assets/candidates.png` if the set ever grows.
