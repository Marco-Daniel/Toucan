# Toucan

Toucan is a VS Code extension that shows at a glance which repository a window has open. This is its repository: the extension, the shared configs, and the docs that hold its rules and plans.

For what Toucan does and how to install it, see the [extension's README](apps/extension/README.md).

## Layout

```
apps/extension/     toucan: the VS Code extension (src/, test/, scripts/, media/, its manifest and README)
packages/brand/     @toucan/brand: the presets, color tokens, glyph names, icon, logo and glyph SVGs
config/ts-config/   @toucan/ts-config: the shared TypeScript settings
config/vite/        @toucan/vite-config: the shared Vite and Vitest settings
docs/adr/           the architecture decisions: the system's rules and direction
docs/plans/         one folder per piece of work: its plan, decisions and progress
scripts/, test/     the repo's own tooling and its tests: qmd docs search, the docs-sync helper and mutate
```

The root is the workspace: `pnpm-workspace.yaml`, `turbo.json`, the shared `.oxlintrc.json` and oxfmt config, the husky hook and CI. The website plan ([docs/plans/website](docs/plans/website/plan.md)) adds `apps/site/`.

Start with the [architecture decisions](docs/adr/README.md): they're the most important docs. `GROUNDING.md` lists the repo's facts and conventions, and `.claude/CLAUDE.md` the rules agents work by.

## Development

Requires Node 24 (see `.nvmrc`) and pnpm through corepack. Run `corepack enable pnpm` once, so `pnpm` is on your PATH: Turborepo starts each package's tasks with it. Then run `pnpm install` at the root.

From the root, Turborepo runs these in every package, in dependency order:

| Command          | What it does                                                                    |
| ---------------- | ------------------------------------------------------------------------------- |
| `pnpm lint`      | Lint with oxlint, with type information; any finding fails                      |
| `pnpm typecheck` | Typecheck with TypeScript 7                                                     |
| `pnpm test`      | Run the unit tests with vitest                                                  |
| `pnpm build`     | Build every package; for the extension, bundle `dist/extension.cjs` with tsdown |

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
| `check:vsix`      | Fail when the VSIX would ship anything other than its expected files                                                                                                                              |
| `package`         | Build and package a VSIX                                                                                                                                                                          |
| `mutate [file…]`  | StrykerJS mutation testing of the given files, or all of the extension; on demand                                                                                                                 |

`pnpm install` also sets up a pre-push hook (husky) that runs `typecheck`, `lint`, `format:check` and `test` from the root. It's set up per checkout, so run `pnpm install` in a new worktree before pushing from it. `HUSKY=0` skips it; CI skips it and runs the full set itself.

### Generated files

`src/generated/`, the glyph font and the extension icon in `apps/extension`, and the glyph SVGs in `packages/brand/assets/glyphs/`, are written only by the extension's `gen`, `font` and `icon` scripts, never by hand. `check:generated` regenerates them and fails if the result differs from what's committed, and CI runs it.

### Mutation testing

`mutate` runs StrykerJS on demand, not in CI or the pre-push hook: `pnpm mutate` at the root for the repo's own tooling, `pnpm -C apps/extension mutate` for the extension, each with its package's `stryker.config.json`. Pass the files you changed, relative to that package; it refuses files outside it. Read every survived mutant: kill it with a test, or say why it's equivalent. The qmd tooling in `scripts/qmd/` is never mutated: the root's config leaves it out and `mutate` refuses its files ([ADR-0012](docs/adr/0012-no-mutation-testing-for-scripts-qmd.md)). Reports land in the package's `reports/stryker/`; delete that folder after changing what's excluded.

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
