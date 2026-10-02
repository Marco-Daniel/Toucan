# Context: Toucan glyph set

## What exists

- **`src/core/glyphs.ts`**: `SHAPES: Record<Glyph, GlyphShape>`, where each shape has an `icon` id for `$(…)`, a `width` (the height is always 16) and an SVG `body` in `currentColor`. square, bar and pill are Toucan's own (`toucan-*` icons). circle, double-circle, heart, star and check-circle reuse codicon paths from `@vscode/codicons` 0.0.46 (© Microsoft, CC BY 4.0). `FONT_CODEPOINTS = { pill: 0xe000, square: 0xe001, bar: 0xe002 }`. `FALLBACK_ICON` is `circle-large-filled`, used where no glyph applies (toucan-v1 0005). `glyphSvg(glyph, hex, size?)` renders a shape for swatches.
- **`src/core/model.ts`**: `GLYPHS` (eight names) and `DEFAULT_GLYPH = "square"`.
- **`scripts/build-font.mts`** (`pnpm font`): reads `FONT_CODEPOINTS` and `glyphSvg`, writes `media/icons/<name>.svg` and `media/toucan-icons.woff`. Its metrics: 16 SVG units per em, the baseline 1/8 up, to line up with codicons.
- **`src/core/config.ts`**: validates `glyph` against `GLYPHS`. An unknown value logs ``glyph "…" is not one of …; using square.`` and falls back to `DEFAULT_GLYPH`.
- **`src/commands.ts`**: `setGlyph` builds a quick pick from `GLYPHS`. Each item gets `iconPath: swatch(glyph, repo color)` and "current" on the active glyph, through `pickWithPreview` (live preview, reverted on cancel). The Pick Preset Color command also uses `swatch` with the repo's glyph.
- **`src/core/emoji.ts`**: `FAMILIES: Record<Glyph, …>` maps each glyph to the SQUARES, CIRCLES or HEARTS families. A `Record<Glyph, …>` won't type-check until every new glyph is added, which is useful.
- **`package.json`**: the `glyph` enum under the repo object schema and the `icons` contribution for the font glyphs. A manifest test (`test/core/manifest.test.ts`) ties both to the code.
- **Tests**: `test/core/glyphs.test.ts`, `emoji.test.ts`, `config.test.ts`, `sidebarHtml.test.ts` and `manifest.test.ts` all touch glyphs.
- **CI**: `pnpm check:generated` (gen + font + icon + clean tree) runs in CI and in the *Package VSIX* workflow, so the committed font has to match the shapes.
- **README**: lists the glyphs under *Toucan: Set Glyph* and in the config example, and carries the codicon attribution line.

## Patterns to follow

- Pure logic stays outside `vscode` and is unit tested (GROUNDING.md).
- Erasable-only TypeScript with explicit `.ts` imports.
- Generated files (`media/icons`, the font, `src/generated`) are produced by scripts and checked by `check:generated`. Never edit them by hand.
- Test rules from `.claude/CLAUDE.md`: test behavior, not implementation, and add no tautological tests.

## Integration points

- `$(toucan-<name>)` in the status bar item text needs the icon contributed in `package.json`.
- The sidebar block (`src/core/sidebarHtml.ts`) draws the glyph large in the middle, so detail and holes have to hold up when the glyph is big, too.

## Constraints

- Single color: the glyph is painted in the repo color, so shapes carry everything.
- Readable at 12 to 16px, on both dark and light status bars.
- Font conversion keeps only filled outlines. Strokes and masks are dropped, and holes depend on winding.
- The repo is public: no references to other projects or local paths in code, docs or PR text.
