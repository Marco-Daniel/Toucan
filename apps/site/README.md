# Toucan's website

The site at [toucan-vscode.netlify.app](https://toucan-vscode.netlify.app): a landing page, the docs and a changelog. It's React Router in framework mode, pre-rendered at build time with nothing running on a server, and styled with Tailwind in the brand's colors ([website plan](../../docs/plans/website/plan.md)).

## Where things are

- `app/routes.ts` and `app/routes/`: the pages. `app/root.tsx` holds the layout, the nav and the footer.
- `content/docs/<slug>.md`: one markdown file per docs page, listed in `app/lib/docs.consts.ts`. Images are README screenshots, by file name.
- `content/releases.json`: the changelog's fallback when the build can't reach GitHub.
- `public/_redirects` and `public/_headers`: Netlify's rules. Any path the site doesn't have gets the SPA fallback (the not-found page) with a 404, and every response carries the security headers. The deploy refuses a build without either file, and `check:pages` checks both.
- `assets/og-card.svg` and `public/og-image.png`: the social media card every page names as its Open Graph and Twitter image. The card's text is outlined from Inter (see the repo's THIRD_PARTY_NOTICES.md), so it renders the same everywhere without fonts.
- From `@toucan/brand`: the presets, the colors (as Tailwind theme tokens), the glyphs, the icon and the logo. From the extension: its icon and the README screenshots in `apps/extension/media/readme/`.

## Commands

Run these with `pnpm -C apps/site <script>`, or `pnpm <script>` in this folder.

| Script              | What it does                                                                                                                                                                              |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dev`               | Serve the site with live reload                                                                                                                                                           |
| `build`             | Pre-render every page into `build/client`, plus the SPA fallback that `public/_redirects` gives every unknown path, with a 404                                                            |
| `typegen`           | Write React Router's route types into `.react-router/`; Turborepo runs it before `lint` and `typecheck`                                                                                   |
| `check:pages`       | After a build: every page has its title, description and Open Graph tags, and every link, anchor and image resolves (CI runs it)                                                          |
| `screenshots`       | After a build: full-page screenshots of every page at 390, 768 and 1280 px in `build/screenshots/`; fails on sideways scroll or a tap target under 44 px. Needs Chrome, so it isn't in CI |
| `releases:snapshot` | Refresh `content/releases.json` from GitHub after a release; commit the result                                                                                                            |
| `og-image`          | Render the social media card to `public/og-image.png` from `assets/og-card.svg` and the brand's icon; commit the result                                                                   |
| `check:generated`   | Fail when `public/og-image.png` isn't what `og-image` renders now (CI runs it)                                                                                                            |
| `mutate [file…]`    | StrykerJS mutation testing of `app/lib` and the deploy logic; it mutates in place, so commit first                                                                                        |
| `deploy:netlify`    | Deploy `build/client` to Netlify; the `Deploy site` workflow runs it from `main` with the token, nobody else                                                                              |

`screenshots` uses Chrome at `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`; pass another with `--chrome <path>`. On Linux, give the real browser binary, not a launcher script such as `/usr/bin/google-chrome` that starts it: the script stops only processes running the binary it started, so through a launcher it would leave Chrome running after the run. Two runs at the same time are fine: each stops only the Chrome of its own profile, rechecking each process right before it stops it, and leaves another run's profile alone while it's young enough to be in use. At start it removes only old profiles of yours that nothing uses; a Chrome it can't account for stops the run with its pid and command, for you to look at.

The changelog reads the GitHub releases when the site is built: with `GITHUB_TOKEN` set (CI sets it) it gets a higher rate limit, and when GitHub can't be reached it uses the snapshot instead of failing.
