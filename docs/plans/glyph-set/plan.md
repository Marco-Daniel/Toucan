# Plan: Toucan glyph set

## Goal

Give every repo a glyph that is both a second cue next to color and a bit of personality. Today there are eight glyphs: three from Toucan's own icon font (square, bar, pill) and five built-in codicons (circle, double-circle, heart, star, check-circle). After this change there are 17 (the planned 16 plus a water drop, → [0007](decisions/0007-redraw-the-leaf-and-add-a-water-drop.md)), all drawn by Toucan in one style and served from Toucan's own font, in four themed groups:

| Group          | Glyphs                       |
| -------------- | ---------------------------- |
| Shapes         | square, bar, pill, circle    |
| Toucan's world | toucan, sun, leaf, drop, moon |
| Characters     | alien, ghost, robot, cat     |
| Fun & dev      | bolt, heart, star, rocket    |

The glyph shows up in the status bar, the tooltip swatch, the sidebar block and the Set Glyph quick pick. All four read it from the same shape, so they keep matching.

Once this is merged, the glyphs ship in a v0.0.2 release.

## Non-goals

- No user-supplied or arbitrary codicon glyphs: the list stays curated and enum-validated (toucan-v1 0012).
- No multicolor glyphs: every glyph is painted in the repo color only.
- No new emoji families: the experimental search emoji keeps its square, circle and heart sets (see Components).
- No change to colors, presets or the sidebar layout.

## Approach

All 16 glyphs move into Toucan's own icon font (→ [0001](decisions/0001-draw-every-glyph-in-toucans-own-font.md)), so they share one size, weight and baseline, and the codicon CC BY 4.0 attribution can go. The set is themed (→ [0002](decisions/0002-curate-sixteen-glyphs-in-four-themed-groups.md)). It drops double-circle and check-circle (→ [0003](decisions/0003-drop-double-circle-and-check-circle.md)). Every glyph follows one style: polygonal with softened corners, filled, single color, holes kept open (→ [0004](decisions/0004-draw-glyphs-polygonal-with-softened-corners.md)). The toucan is drawn after the app icon (→ [0005](decisions/0005-draw-the-toucan-after-the-app-icon-with-a-cut-out-eye.md)), and the sun uses separate pointy rays (→ [0006](decisions/0006-draw-the-sun-with-eight-separate-pointy-rays.md)).

The shapes in [assets/glyph-sheet.py](assets/glyph-sheet.py) are the agreed geometry. Port them into `src/core/glyphs.ts` as the single source; from there `pnpm font` builds the font and the SVG sources in `media/icons`, as it does now. The Python file is a design reference only. It doesn't run in the build and isn't part of the shipped code.

## Components

- **Glyph shapes (`src/core/glyphs.ts`)**: one entry per glyph: icon id `toucan-<name>`, width, and an SVG body drawn in `currentColor`. The softened corners and holes are baked into the path geometry, not drawn with strokes or masks. Font tools ignore strokes, and the swatch, sidebar and font have to agree. Holes follow the font's fill rule (opposite winding), so they stay open in the font as well as in the SVG. `FONT_CODEPOINTS` grows to 16 entries. Keep the existing codepoints for pill, square and bar, and append the rest. The codicon helper and its attribution go.
- **Glyph list (`src/core/model.ts`)**: `GLYPHS` becomes the 16 names in group order. `DEFAULT_GLYPH` stays `square`.
- **Font build (`scripts/build-font.mts`)**: unchanged in shape. It now emits 16 SVGs into `media/icons` and the font. `pnpm check:generated` keeps the committed output honest.
- **Manifest (`package.json`)**: the `glyph` enum (with enumDescriptions if useful), the `icons` contribution for each `toucan-*` id, and anything else the manifest test ties to `GLYPHS`.
- **Config parsing (`src/core/config.ts`)**: an unknown glyph already falls back to `square` with a warning. Repos still set to `double-circle` or `check-circle` take that path (→ 0003). Make sure the warning reads well for them.
- **Set Glyph (`src/commands.ts`)**: already in the command palette as *Toucan: Set Glyph*, with a swatch per item in the repo color and a live preview while you move through the list. It picks up the 16 glyphs automatically. Add a quick pick separator per group, so the list reads as Shapes, Toucan's world, Characters, Fun & dev. Labels can stay the glyph names.
- **Emoji (`src/core/emoji.ts`)**: `FAMILIES` gets an entry per glyph. circle → circles, heart → hearts, and every other glyph → squares. No emoji exists that both matches the shape and comes in the repo colors. Star already uses squares for this reason (toucan-v1 0012).
- **Docs**: README (glyph list, the codicon attribution line), THIRD_PARTY_NOTICES if it mentions codicons, and a superseded note on toucan-v1 0012 for the glyph list.

## Data flow

`glyphs.ts` shapes → `pnpm font` → `media/icons/*.svg` + `media/toucan-icons.woff` → the status bar shows `$(toucan-<name>)`. The same shapes → `glyphSvg()` → the tooltip swatch, the sidebar block and the Set Glyph item icons. A repo's `glyph` setting → `config.ts` (validated, unknown → square plus warning) → all of the above, plus `emojiFor()` for the experimental search emoji.

## Risks

- **Small-size legibility.** Detail (the toucan's eye, the robot's mouth, the rocket's window) can fill in at 16px or on low-DPI screens. Mitigation: holes get a lighter softening than outer corners, and Marco checks the result in VS Code on both Dark Modern and Light Modern before the PR is done.
- **Geometry differs between SVG and font.** Strokes, masks and even-odd fills don't survive font conversion. Mitigation: plain filled paths with baked-in rounding and explicit winding. A test can assert that every body uses `<path>` only, with no stroke.
- **Existing configs with a dropped glyph.** They change to square. Accepted (→ 0003): the warning tells the user, and Set Glyph fixes it in one step.
- **The toucan is 18 wide.** That's slightly wider than the other 16-wide glyphs, so the name next to it shifts a little. Accepted for recognisability (→ 0005).

## Open questions

- **Rounding approach in code:** offset each polygon with round joins, or fillet each corner with an arc? Either works if the output is a plain path that matches the sheet. The implementer picks one.
- **Glyph names in Set Glyph:** keep the plain names, or use title case ("Toucan", "Sun")? Minor. Settings values stay lowercase either way.

## After merge: v0.0.2

Release v0.0.2 as a new release; don't replace v0.0.1. It carries the extension icon from PR #3 and this glyph set. Bump `version` in `package.json` (in a small PR, since main is protected), run the *Package VSIX* workflow, and publish the VSIX as release `v0.0.2`.

## Assets

- [glyph-sheet.png](assets/glyph-sheet.png): the agreed 16, large and at status bar size on dark and light status bars (sun shown as `sun-pins-8`).
- [candidates.png](assets/candidates.png): the wider candidate sheet from the brainstorm, including the ones left out (double-circle, check-circle, other suns, flame, paw, crown, gem).
- [toucan-tries.png](assets/toucan-tries.png): the toucan variants tried at 16px.
- [glyph-sheet.py](assets/glyph-sheet.py): the generator for the sheet. It holds the reference geometry, with the 16-unit grid, the `R = 1.5` softening and the hole and sun stroke widths. Run with `python3` to regenerate `glyph-sheet.svg`.
