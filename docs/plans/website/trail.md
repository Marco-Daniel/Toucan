# Thinking trail: Toucan website and monorepo

## Starting framing

Marco wanted to publish Toucan officially and give it a website: static, React, Vite with custom plugins "for a Gatsby-esque experience", without Gatsby, and easy to host on Netlify from a pipeline. His hunch was that a simple site only needs vite-react-ssg.

## Turns

**From the hunch to React Router.** A maintenance and community check of the options (October 2026) overturned the vite-react-ssg hunch:
- it has one maintainer and few releases;
- it depends on react-router v6, which reached end of life in June 2026;
- its own README points newer React Router users elsewhere.

The same check found that React Router's framework mode now does static pre-rendering itself, with the Gatsby-like loader and meta model. Marco picked it. → 0001

**Publishing split off.** Marco first said "Microsoft Store". VS Code extensions are published on the Visual Studio Marketplace (and Open VSX), which needs its own setup, so it became a separate plan. → 0013

**From a site folder to a monorepo.** The first outline had `site/` as a second workspace package next to the extension at the root. Marco saw that this really means rebuilding the repo as a monorepo and wanted to think it through, using a larger professional monorepo as inspiration while doing some things differently.

From that inspiration we took:
- `apps/`, `packages/` and `config/` groups;
- private, source-only internal packages under one scope;
- shared config packages;
- Turborepo with dependency-ordered, cached tasks.

We left out the parts that don't fit a small project: per-app root scripts, separate test packages, extra package groups. → 0004, 0005, 0006, 0009

**The README split.** Asked how the extension's README should work after the move, Marco said the developer info in today's README already bothered him, because it ends up on the extension's Marketplace page. The monorepo gives each audience its own README. → 0007

**The design, by mockup.** The first mockup was approved with these corrections along the way: → 0011, 0012
- The icon's green tile around the bird clashed with the big sun behind it, so the hero now shows the bird alone.
- Marco then asked for the sunset and a better-balanced hero, so the hero became the icon's own scene without the tile.
- The beak band sat in the wrong place as a full-width divider. It became the nav's bottom edge and a marker above section headings.
- The search emoji card showed the empty corner of a thin strip, so it now zooms onto the Command Center.
- The repo names in the status bar rows take their glyph's color, as in VS Code.
- At phone width the page scrolled sideways (grid items widened by long code lines). Marco asked that mobile works properly.

**Netlify set up before the build.** Marco created the `toucan-vscode` site with a placeholder upload. The site ID went into a repository variable. The token's `gh secret set` first failed with the work account active, and worked with the personal account's token. → 0010

**Previews dropped for security.** DevOps pointed out that a plain repository secret can be read by a workflow on any branch of the repo. Preview deploys need the token on pull-request branches. Marco dropped the previews: in a public repo, security of the secrets and actions comes first, and DevOps carries extra responsibility for it. → 0010

## Rejected without a decision file

- A hand-written root script per app: generic `turbo run <task> --filter` covers it.
- Separate test packages: tests stay next to the code they test (ADR-0010).
- npm workspaces and dotenv files: Toucan stays on pnpm and has no environment config.

## Open / to re-check

- Where the README screenshots live after PR 2: with the extension, or in `@toucan/brand`.
- The Open Graph image for the site.
- When React Router's next major lands, the upgrade is planned work.
