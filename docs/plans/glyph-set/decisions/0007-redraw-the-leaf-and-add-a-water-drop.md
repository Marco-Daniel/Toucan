# 0007. Redraw the leaf and add a water drop

- Status: Accepted
- Date: 2026-10-02
- Deciders: Marco

## Context and Problem

Marco reviewed the implemented set. The leaf from the sheet, a skewed polygon, didn't read as a leaf. He also missed the water drop, a candidate that hadn't made the 16.

## Considered Options

- **Leaf:** A, a pointed blade on a short stem; B, the same with a cut-out center vein; C, a broader blade with a vein.
- **Drop:** the plain drop from the candidate sheet, or the same with a small cut-out highlight.
- **Placement:** put the drop in Toucan's world (five glyphs there), or replace a glyph to keep four groups of four.

## Decision Outcome

Chosen: **leaf A, the plain drop, in Toucan's world** (toucan, sun, leaf, drop, moon). That makes 17 glyphs. Marco picked these from a preview at large size and at status bar size on dark and light.

- The leaf is a blade from (3.6, 12.4) to (14.3, 1.7) whose half-width follows sin(πt)^0.8 (3.6 at its widest), plus a stem from (1.2, 14.8) to (4.6, 11.4).
- The drop is the candidate sheet's polygon with its tip and bottom moved 0.1 inward, so the softened outline stays inside the 16-unit box.
- The drop's codepoint follows the group order like the rest (e007; moon and the glyphs after it move up by one). Only pill, square and bar have shipped, so no released codepoint changes.

## Consequences

- Good: a leaf that reads as a leaf at 16px, and a drop for water-themed repos.
- Bad: one group of five breaks the four-of-four layout from 0002.
- The vein (B and C) and the drop's highlight closed up at status bar size, so they were left out.
