# Toucan's website

The site at [toucan-vscode.netlify.app](https://toucan-vscode.netlify.app): a landing page, the docs and a changelog. It's React Router in framework mode, pre-rendered at build time with nothing running on a server, and styled with Tailwind in the brand's colors ([website plan](../../docs/plans/website/plan.md)).

## Where things are

- `app/routes.ts` and `app/routes/`: the pages. `app/root.tsx` holds the layout, the nav and the footer.
- `content/docs/<slug>.md`: one markdown file per docs page, listed in `app/lib/docs.consts.ts`. Images are README screenshots, by file name.
- `content/releases.json`: the changelog's fallback when the build can't reach GitHub.
- From `@toucan/brand`: the presets, the colors (as Tailwind theme tokens), the glyphs, the icon and the logo. From the extension: its icon and the README screenshots in `apps/extension/media/readme/`.

## Commands

Run these with `pnpm -C apps/site <script>`, or `pnpm <script>` in this folder.

| Script              | What it does                                                                                                                                                                              |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dev`               | Serve the site with live reload                                                                                                                                                           |
| `build`             | Pre-render every page into `build/client`, and copy the 404 page to `404.html`                                                                                                            |
| `check:pages`       | After a build: every page has its title, description and Open Graph tags, and every link, anchor and image resolves (CI runs it)                                                          |
| `screenshots`       | After a build: full-page screenshots of every page at 390, 768 and 1280 px in `build/screenshots/`; fails on sideways scroll or a tap target under 44 px. Needs Chrome, so it isn't in CI |
| `releases:snapshot` | Refresh `content/releases.json` from GitHub after a release; commit the result                                                                                                            |

The changelog reads the GitHub releases when the site is built: with `GITHUB_TOKEN` set (CI sets it) it gets a higher rate limit, and when GitHub can't be reached it uses the snapshot instead of failing.
