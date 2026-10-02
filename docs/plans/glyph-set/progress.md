# Progress: Toucan glyph set

<!-- Living log. Implementers append newest entries at the top. The planner
     leaves this body empty. Each entry: date, who/what, what changed, what's
     next or blocked. -->

## 2026-10-02 — The implementer, glyph set
- Did:
  - `src/core/glyphDesign.ts` holds the reference sheet's geometry (fills, holes, softening per glyph), ported from `assets/glyph-sheet.py`. `pnpm font` bakes each design into one plain filled path with `clipper-lib` (a devDependency, build time only): fills grown by half their softening with round joins and united, holes grown by half the lighter hole softening and subtracted. Outlines and holes come out with opposite winding, so they read the same under nonzero in SVG and in the font. The paths go to the generated `src/generated/glyphPaths.ts`; the swatches, the sidebar block, `media/icons` and the font all draw from them.
  - Rounding approach (open question): offset with round joins, which is what the sheet's round strokes draw. A boolean difference was needed rather than reversed holes alone: the moon's hole reaches outside its disc, and the toucan's notch cuts through where head and beak overlap.
  - 16 glyphs in four groups (`GLYPH_GROUPS`), all `toucan-*` font icons. pill, square and bar keep e000–e002; the rest follow in group order. The codicon paths and their attribution are gone (README, THIRD_PARTY_NOTICES).
  - double-circle and check-circle read as square with "glyph "…" was retired; using square. Pick another with Toucan: Set Glyph."
  - Set Glyph shows a separator per group (`glyphPickEntries`). Labels stay the plain glyph names (open question: kept lowercase, matching the setting values).
  - Emoji: circle → circles, heart → hearts, every other glyph → squares.
  - Manifest: the glyph enum and 16 icon contributions. toucan-v1 0012 notes that its glyph list is superseded.
- Verified:
  - Raster probes (resvg) on every glyph with holes or gaps: hole centers and the gaps between the sun's rays are clear, bodies are ink, and the moon's hole doesn't paint outside the disc.
  - The font, built from the committed SVGs with the same pipeline and rendered through resvg's text engine, overlaps each glyph's SVG by at least 0.996 (test threshold 0.99), and advance widths match (toucan 18, bar 6, pill 44, the rest 16).
  - Mutation-red: dropping the holes, not cutting them, no softening, sun rays touching the disc, a moved font baseline, codepoint order, groups, the retired-glyph warning, the emoji rule.
- Next: Marco's visual sign-off in VS Code on dark and light; then the review rounds.

