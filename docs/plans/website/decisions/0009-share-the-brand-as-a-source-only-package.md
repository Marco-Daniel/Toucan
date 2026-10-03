# 0009. Share the brand as a source-only package

- Status: Accepted
- Date: 2026-10-03
- Deciders: Marco

## Context and Problem

The site needs the presets, the glyph shapes, the icon, the logo and the beak colors. Reading them out of the extension's files couples the site to the extension's internal layout, and retyping them lets them drift.

## Considered Options

- **`@toucan/brand`**, a private package that exports its TypeScript and assets as source
- The site reads the extension's files
- Copies in the site

## Decision Outcome

Chosen: **`@toucan/brand`**. It has no build step: `exports` points at `./src/*`, and tsdown and Vite compile it as part of whoever imports it. It holds the presets (moved from the extension's `presets.consts.ts`), the glyph SVGs and font, the icon and logo SVGs, and the color tokens. The extension imports from it in PR 2, so both products use one source.

## Consequences

- Good: one palette and one set of glyphs for both products, no build artifacts to keep in sync.
- Bad: the extension's ADR-0010 layout gains an outside import path; the package must stay free of `vscode` and React.

## Amendment (2026-10-03)

The brand holds the glyph SVGs, not the font. The extension keeps the glyph designs (`glyphDesign.consts.ts`), the bake and the woff: VS Code loads `contributes.icons` from inside the extension's folder, and the site only needs the SVGs. `pnpm font` in the extension writes the SVGs into `packages/brand/assets/glyphs/`.
