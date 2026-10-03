# Context: Toucan website and monorepo

## What exists (main at the time of planning)

- **One package at the root**: `toucan` 0.0.4, the VS Code extension `marco-daniel.toucan`.
  - Code: `src/` in the ADR-0010 layout (`core/`, `shared/<topic>/`, `features/<feature>/`, `generated/`, role suffixes, no barrels).
  - Tests: `test/` mirrors `src/`.
  - Scripts and assets: `scripts/` (font, icon, qmd, docs-sync, screenshots, check-vsix, check-bundle, mutate) and `media/`.
- **Tooling**:
  - pnpm 12, TypeScript 7 (`tsc --noEmit`), tsdown builds `dist/extension.cjs`.
  - oxlint, type-aware, every finding an error (ADR-0007, ADR-0008); oxfmt at width 100.
  - vitest 5; StrykerJS on demand (`pnpm mutate`).
  - husky pre-push: typecheck, lint, format:check, test.
- **Generated files**: `pnpm gen` (vscode-ext-gen), `pnpm font`, `pnpm icon`. `check:generated` fails when they are out of date.
- **Packaging**:
  - `pnpm package` runs tsdown, then `vsce package --no-dependencies`.
  - `.vscodeignore` allows exactly 8 files: `dist/extension.cjs` and its map, `package.json`, `README.md`, `LICENSE`, `THIRD_PARTY_NOTICES.md`, `media/toucan-icons.woff`, `media/icon.png`.
  - `check:vsix` enforces that list.
- **CI**: `.github/workflows/ci.yml` runs the gates; `package.yml` builds the VSIX. Releases are GitHub releases with notes (ADR-0013).
- **Docs**:
  - `docs/adr/` (0001–0013) and `docs/plans/<plan>/`, indexed by qmd as the `toucan-docs` and `toucan-guides` collections (ADR-0011).
  - GROUNDING.md and `.claude/CLAUDE.md` describe the layout and the commands.
- **README**: user and developer content mixed, with screenshots in `media/readme/` made by `pnpm screenshots`.
- **Brand assets**:
  - `media/toucan-icon.svg`: a jungle-green tile holding a 12-sided orange sun that sinks behind a horizon line, and a low-poly black toucan with a cream beak banded amber, orange and black.
  - `media/toucan-logo.svg`: the bird alone.
  - `media/icons/*.svg`: 17 glyphs in 4 groups (`GLYPH_GROUPS` in `src/shared/model/model.consts.ts`).
  - The 16 presets live in `src/shared/color/presets.consts.ts`.

## Patterns to follow

- **Packages**: private, named `@toucan/<name>`, each with its own `lint`, `typecheck`, `test` and `build` scripts.
- **Shared code packages are source-only**: `exports` maps `"./*"` to `./src/*`, with no build step and no `dist/`.
- **Imports stay explicit**: an import names a file, never a barrel (ADR-0010). Relative imports keep their `.ts` extensions; workspace imports go through the package name.
- **Tests**: every test must be able to fail (`.claude/CLAUDE.md`). Site tests assert rendered output and loader results literally.
- **Errors**: `tryCatch` in scripts and loaders too (ADR-0009).
- **This repo is public**: nothing in it may name other projects, local paths or session names.

## Integration points

- **Netlify**: site `toucan-vscode`, not linked to Git. The site ID is the repository variable `NETLIFY_SITE_ID`, the token `NETLIFY_AUTH_TOKEN` (set as a repository secret, to be moved into the `production` environment by DevOps).
- **GitHub releases API**: the changelog source, read at build time with the workflow's token.
- **vsce**: packages from `apps/extension` after the move. It reads that folder's README, and rewrites relative image links using the `repository` field, so the README's image links must resolve from the repo root.
- **qmd**: the collection paths for `docs/` stay; `toucan-guides` gains the app READMEs.

## Constraints

- PR 1 changes no behaviour: identical VSIX contents, all tests unchanged except their paths.
- No secrets in the repo. Only `main` deploys can read the token.
- Every page works at 390 px with no horizontal scroll.
