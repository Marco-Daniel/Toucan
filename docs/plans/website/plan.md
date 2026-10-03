# Plan: Toucan website and monorepo

## Goal

Give Toucan a public website at `toucan-vscode.netlify.app`: a landing page, docs and a changelog. Build it in React with React Router's pre-rendering and Tailwind, and deploy it from GitHub Actions (→ 0001, 0002, 0003, 0010). To keep the site and the extension apart, first turn the repo into a monorepo that both live in (→ 0004).

## Non-goals

- Publishing to the Visual Studio Marketplace or Open VSX (→ 0013).
- A custom domain, analytics, or a cookie banner.
- Changing the extension's behaviour. The move in PR 1 is behaviour-free (→ 0008).

## Approach

The work lands as three PRs in order (→ 0008), each through the full review loop.

**PR 1: the monorepo move.** The extension moves to `apps/extension/` (its `src/`, `test/`, `scripts/`, `media/` and VS Code manifest). The root becomes the workspace: `pnpm-workspace.yaml`, `turbo.json`, the shared `.oxlintrc.json` and oxfmt config, husky, CI. The TypeScript and Vite/Vitest settings become `config/ts-config` and `config/vite` (→ 0006). Turborepo runs lint, typecheck, test and build in dependency order, and affected-only on CI (→ 0005).

The README splits by audience (→ 0007):
- `apps/extension/README.md` is the user-facing page that vsce packages for the Marketplace.
- The root README is for developers.

A new repo-level ADR records the monorepo layout. ADR-0010 keeps governing the extension's `src/`, with its paths updated. GROUNDING, CLAUDE.md, qmd's collection paths, docs-sync and every script and doc path follow the move.

The proof that nothing changed: the VSIX holds the same 8 files, `dist/extension.cjs` builds the same, and every test passes unchanged in its new place.

**PR 2: `@toucan/brand`.** A private, source-only package (→ 0009) holds:
- the presets, moved from the extension;
- the glyph SVGs and font;
- the icon and logo SVGs;
- the color tokens.

The extension switches its imports to it. Glyph and font generation moves with the assets, or points at them. `check:generated` keeps passing.

**PR 3: the site and its deploy.** `apps/site/` uses React Router v8 framework mode with `ssr: false` and `prerender` (→ 0001), Tailwind themed from `@toucan/brand` (→ 0002), and the approved mockup's design (→ 0011, [assets/mockup.html](assets/mockup.html)). Every page is checked at three widths (→ 0012). A workflow deploys it to Netlify from `main` only, with the token locked in a `production` environment (→ 0010).

## Components

- **Routes**:
  - `/`: the landing page, laid out like the mockup.
  - `/docs/*`: one page per feature (colors, presets, glyphs, the sidebar, the search emoji, settings, commands).
  - `/changelog`: release history.
  - A 404 page.
  - Each route sets its own `meta` (title, description, Open Graph image).
- **Layout**: the sticky nav with the beak band, the footer, and the docs sidebar (a menu on phones).
- **Build-time content**:
  - presets, glyphs and the icon from `@toucan/brand`;
  - screenshots from `apps/extension/media/readme/`;
  - releases from the GitHub releases API at build time, with markdown rendered to HTML.
- **Theme**: the Tailwind tokens from `@toucan/brand` (plumage black, cream, amber, orange, jungle green, the presets).
- **Deploy workflow**: production deploys from `main` only, gated on Turborepo's affected graph, with the token in the `production` environment.

## Data flow

At build time, the route loaders read `@toucan/brand`, the README screenshots and the GitHub releases. React Router then pre-renders every route to HTML in `apps/site/build/client`, and the workflow uploads that folder to Netlify. Nothing runs on a server.

## Risks

- **The move breaks something quietly.** Packaging, CI or a path in a script or doc could break without an obvious error. Mitigation: PR 1 is move-only, `check:vsix` and an identical build are the proof, and docs-sync runs over the moved docs.
- **Site dependencies leak into the extension.** Mitigation: separate workspaces; the 8-file VSIX check stays in CI.
- **The changelog's GitHub API call fails or hits its rate limit at build time.** Mitigation: use the workflow's token, and fall back to the last committed snapshot instead of failing the deploy.
- **The site and the extension's README drift.** Mitigation: docs-sync covers `apps/site` content too.
- **React Router ships a major version yearly.** Upgrades are planned work, not surprises.
- **A leaked deploy token.** The repo is public. Mitigation: the token sits in a `production` environment only `main` may use, there are no pull-request deploys, permissions are read-only and the tooling is pinned.
- **Turborepo cache outputs.** A task without declared outputs replays its logs without restoring files. Every task that writes files declares them.

## Open questions

- Whether `media/readme/` screenshots belong in `@toucan/brand` or stay with the extension. The plan keeps them with the extension, because the screenshot script writes them there.
- The site's Open Graph image: a render of the hero scene, made at build time or committed once.
- The mockup asset links `../../../../media/readme/`, which moves in PR 1; update the link there.
