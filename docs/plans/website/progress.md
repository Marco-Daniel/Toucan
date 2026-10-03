# Progress: Toucan website and monorepo

<!-- Living log. Implementers append newest entries at the top. The planner
     leaves this body empty. Each entry: date, who/what, what changed, what's
     next or blocked. -->

## 2026-10-03: PR 3, the site and its deploy (implementer)

- `apps/site`: React Router framework mode, pre-rendered with `ssr: false`: the landing page to the approved mockup, eight docs pages from `content/docs/*.md`, the changelog from the GitHub releases with `content/releases.json` as its fallback, and a not-found page: Netlify serves the SPA fallback for any unknown path (`public/_redirects`), which renders it. Tailwind takes the brand's colors as CSS variables rendered from `@toucan/brand`.
- Checks: `check:pages` (in CI) checks every built page's meta, links, anchors and ids. `screenshots` captures every page at 390, 768 and 1280 px and fails on sideways scroll or tap targets under 44 px.
- The social card is `public/og-image.png`, generated from `assets/og-card.svg` and the brand icon, with a staleness check in `check:generated`.
- Deploy: `.github/workflows/deploy.yml` with our own `scripts/deploy.mts` (0010, amendment).
- Next: the review loop, then the first deploy from `main`. Open: refresh `content/releases.json` and run the deploy by hand after each release.

## 2026-10-03: PR 2, `@toucan/brand` (implementer)

- `packages/brand` holds the presets, color tokens, glyph names and groups, icon, logo and glyph SVGs; the extension imports and bundles it. The glyph font stays with the extension (0009, amendment). Merged as #20.

## 2026-10-03: PR 1, the monorepo move (implementer)

- The extension moved to `apps/extension`; the workspace, Turborepo, the config packages, the README split and ADR-0014. No behaviour change, proven against the VSIX and the bundle. Merged as #19.

