# Toucan

Toucan is a VS Code extension that shows at a glance which repository a window has open. This is its repository: the extension, its website at [toucan-vscode.netlify.app](https://toucan-vscode.netlify.app), the shared brand and configs, and the docs that hold its rules and plans.

For what Toucan does and how to install it, see the [extension's README](apps/extension/README.md).

## Layout

```
apps/extension/     toucan: the VS Code extension (src/, test/, scripts/, media/, its manifest and README)
apps/site/          @toucan/site: the website, React Router pre-rendered to static pages (app/, content/, scripts/)
packages/brand/     @toucan/brand: the presets, color tokens, glyph names, icon, logo and glyph SVGs
packages/releases/  @toucan/releases: Toucan's GitHub releases, read for the site's changelog and the extension's CHANGELOG.md
config/ts-config/   @toucan/ts-config: the shared TypeScript settings
config/vite/        @toucan/vite-config: the shared Vite and Vitest settings
docs/adr/           the architecture decisions: the system's rules and direction
docs/plans/         one folder per piece of work: its plan, decisions and progress
scripts/, test/     the repo's own tooling and its tests: qmd docs search, the docs-sync helper and mutate
```

The root is the workspace: `pnpm-workspace.yaml`, `turbo.json`, the shared `.oxlintrc.json` and oxfmt config, the husky hook and CI. The [website plan](docs/plans/website/plan.md) records how the repo got this shape.

Start with the [architecture decisions](docs/adr/README.md): they're the most important docs. `GROUNDING.md` lists the repo's facts and conventions, and `.claude/CLAUDE.md` the rules agents work by.

## Development

Requires Node 24 (see `.nvmrc`) and pnpm through corepack. Run `corepack enable pnpm` once, so `pnpm` is on your PATH: Turborepo starts each package's tasks with it. Then run `pnpm install` at the root.

From the root, Turborepo runs these in every package, in dependency order:

| Command          | What it does                                                                                              |
| ---------------- | --------------------------------------------------------------------------------------------------------- |
| `pnpm lint`      | Lint with oxlint, with type information; any finding fails                                                |
| `pnpm typecheck` | Typecheck with TypeScript 7                                                                               |
| `pnpm test`      | Run the unit tests with vitest                                                                            |
| `pnpm build`     | Build every package: the extension's `dist/extension.cjs` with tsdown, the site's pages with React Router |

From the root, for the whole repo:

| Command               | What it does                                                                |
| --------------------- | --------------------------------------------------------------------------- |
| `pnpm format:check`   | Check formatting with oxfmt (`pnpm format` to fix)                          |
| `pnpm docs:index`     | Register the docs with qmd and refresh its index and embeddings (see below) |
| `pnpm mutate [file…]` | StrykerJS mutation testing of the root's own tooling (see below); on demand |
| `/docs-sync`          | Claude Code skill: report doc drift since the last run, with a fix per item |

The extension's own scripts run with `pnpm -C apps/extension <script>` from the root (`pnpm -C apps/extension package`, say), or `pnpm <script>` inside `apps/extension`. Its package keeps the name `toucan`, part of the extension ID `marco-daniel.toucan`. Paths below are relative to `apps/extension`.

| Script            | What it does                                                                                                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `gen`             | Regenerate `src/generated/meta.ts` and the settings table in the extension's README from its `package.json`                                                                                       |
| `font`            | Bake the glyph designs into paths, rebuild the glyph font in `media/` and write the glyph SVGs into the repo's `packages/brand/assets/glyphs/`                                                    |
| `icon`            | Render the extension icon `media/icon.png` from the repo's `packages/brand/assets/icon.svg`                                                                                                       |
| `screenshots`     | Regenerate the README images in `media/readme/` from the packaged extension. macOS only; VS Code in `/Applications`, or pass `--app <VS Code.app>`; `--frames <dir>` also keeps the hero's frames |
| `check:generated` | Run `gen`, `font` and `icon` (the generated meta and settings table, the glyph font and SVGs, the extension icon) and fail if anything changed (CI runs this)                                     |
| `check:bundle`    | Load the built bundle in plain Node with a stub for `vscode`, so a dependency the bundler left unresolved fails CI instead of activation                                                          |
| `changelog`       | Write `CHANGELOG.md`, which the VSIX ships, from the published GitHub releases; `--release` puts this version's `release-notes.md` first. Not committed                                           |
| `check:vsix`      | Fail when the VSIX would ship anything other than its expected files                                                                                                                              |
| `package`         | Build and package a VSIX                                                                                                                                                                          |
| `mutate [file…]`  | StrykerJS mutation testing of the given files, or all of the extension; on demand                                                                                                                 |

`pnpm install` also sets up a pre-push hook (husky) that runs `typecheck`, `lint`, `format:check` and `test` from the root. It's set up per checkout, so run `pnpm install` in a new worktree before pushing from it. `HUSKY=0` skips it; CI skips it and runs the full set itself.

Every test run gets its own folder in the OS temp folder (`toucan-test-run-…`, from `config/vite/src/testRun.ts`), and every test worker and process a test starts uses it for its HOME, its qmd cache and its TMPDIR. When the run ends the folder is removed, and the run fails if a test left a temp folder behind, naming it: a test removes what it makes, in an `afterEach` or `afterAll`. A run that's killed (a timeout, or a mutant Stryker stops) leaves its one run folder; `find "${TMPDIR:-/tmp}" -maxdepth 1 -type d -name 'toucan-test-run-*' -user "$(id -un)" -mmin +1440` lists those older than a day, for removal. The one exception is `/tmp`, where the extension's screenshot script keeps VS Code's profile because its socket path must stay short: the tests that make folders there check that they're gone.

### Releasing

A release goes from GitHub to the VS Code Marketplace without a publishing secret ([ADR-0015](docs/adr/0015-release-through-drafts-and-publish-from-actions.md)):

1. **The bump PR** sets the version in `apps/extension/package.json` and writes the release's notes in `apps/extension/release-notes.md`, with everything [ADR-0013](docs/adr/0013-release-notes-for-every-release.md) asks for. The VSIX's checksum isn't known yet, so its line reads ``SHA-256: `{{sha256}}` ``.
2. **Run `Package VSIX`** (`package.yml`) on `main`. It runs every gate, writes `CHANGELOG.md` from these notes and every published release's, packages the VSIX, fills in its SHA-256, attests it, and creates a **draft** release with the VSIX and the notes.
3. **Check the draft and publish it**, as Marco: publishing makes the `v*` tag, which only he can create.
4. **`Publish to the Marketplace`** (`publish.yml`) then runs on its own. It checks the release's VSIX (the release asset, the SHA-256 in the notes, the attestation from `package.yml` on `main`) and publishes exactly that file. It signs in as a managed identity through the `marketplace` environment, whose client and tenant ids are its variables.
5. Refresh the site's changelog snapshot (below).

### The website

`apps/site` is the website. Its commands (`dev`, `build`, `check:pages`, `screenshots`, `og-image`, `releases:snapshot`) are in [its README](apps/site/README.md). The `Deploy site` workflow deploys it to Netlify from `main` only: after a push to `main` that touches the site or what it's built from, or by hand. After a release, run `pnpm -C apps/site releases:snapshot`, commit the result, and run `Deploy site` by hand so the changelog shows the new release.

### Generated files

`src/generated/`, the glyph font and the extension icon in `apps/extension`, and the glyph SVGs in `packages/brand/assets/glyphs/`, are written only by the extension's `gen`, `font` and `icon` scripts, never by hand. The site's social media card, `apps/site/public/og-image.png`, is written only by its `og-image` script. Each package's `check:generated` regenerates its files and fails if the result differs from what's committed; CI runs `pnpm turbo run check:generated` for all of them.

### Mutation testing

`mutate` runs StrykerJS on demand, not in CI or the pre-push hook: `pnpm mutate` at the root for the repo's own tooling, and `pnpm -C <package> mutate` for the extension, the brand, the releases package and the site, each with its package's `stryker.config.json`. The site's and the releases package's mutate in place, because they import from other packages, so commit your work before you run them. Pass the files you changed, relative to that package; it refuses files outside it. Read every survived mutant: kill it with a test, or say why it's equivalent. The qmd tooling in `scripts/qmd/` is never mutated: the root's config leaves it out and `mutate` refuses its files ([ADR-0012](docs/adr/0012-no-mutation-testing-for-scripts-qmd.md)). Every run is a full run for the files you pass (`incremental: false` in every config), so no result is reused from an earlier run and a weakened or deleted test shows at once. Reports land in the package's `reports/stryker/`.

### Docs search with qmd

[qmd](https://github.com/tobi/qmd) gives local keyword and semantic search over the docs, and it's part of the setup for working on Toucan: agents search the docs with it instead of reading whole folders, which finds things far better. Claude Code sessions in this repo use it through `.mcp.json`. The extension itself doesn't need it, and CI never installs it.

Toucan keeps its docs in its own qmd index, `toucan`, so it never touches your other qmd collections. Search it yourself with `qmd --index toucan query "…"`.

One-time setup:

1. Install qmd 2.8 or newer: `npm i -g @tobilu/qmd`. Do this under the Node version your editor and Claude Code use (with nvm, run it while that version is active), so `qmd` is on their `PATH`.
2. If npm says it skipped install scripts, try qmd anyway: the prebuilt binaries usually work. If they don't, reinstall with `--allow-scripts=` followed by the packages npm lists in its warning, comma-separated. The list depends on the qmd version; e.g., for qmd 2.8.3: `npm i -g @tobilu/qmd --allow-scripts=node-llama-cpp,tree-sitter-go,tree-sitter-python,tree-sitter-rust,tree-sitter-typescript,tree-sitter-javascript`.
3. Check it: `qmd --version` prints 2.8 or newer, and `command -v qmd` prints its path.
4. Start a Claude Code session here. A session-start hook registers Toucan's two collections, `toucan-docs` (`docs/`) and `toucan-guides` (the READMEs and GROUNDING.md), and builds the keyword index in the background.
5. The first search or `pnpm docs:index` downloads qmd's models (about 2 GB, one-time); that's expected and well worth it.
6. Run `pnpm docs:index` once for full embeddings (semantic search). It's safe to rerun. If the collections already point at another checkout that still exists, it leaves them alone unless you pass `--force`.

After that, a hook keeps keyword search fresh whenever a doc is edited. Run `pnpm docs:index` again after bigger doc changes, to refresh the embeddings.

The index points at the checkout that registered it, so a search from another worktree sees that checkout's docs.

## Contributing

Changes land through pull requests, one piece of work at a time; larger work starts with a plan in `docs/plans/`. A pull request goes through review rounds until a round finds nothing, and CI must pass. Before changing an area, read its ADRs; a change that breaks a constraint needs a new ADR that supersedes it.

Code follows the rules in `.claude/CLAUDE.md`: the layout, error handling, object arguments, tests that can fail, and docs kept in sync with the code in the same pull request. The repository is public, so nothing committed may hold local paths, credentials or private details.

## License

[MIT](LICENSE)
