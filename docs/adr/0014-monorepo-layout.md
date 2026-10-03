# 0014. Monorepo layout: apps, packages, config, and the root's own tooling

- Status: Accepted
- Date: 2026-10-03
- Deciders: Marco
- Kind: constraint
- Area: layout
- Decided in: [website/0004](../plans/website/decisions/0004-turn-the-repo-into-a-monorepo.md), [website/0005](../plans/website/decisions/0005-orchestrate-tasks-with-turborepo.md), [website/0006](../plans/website/decisions/0006-share-typescript-and-vite-vitest-configs-as-packages.md), [website/0009](../plans/website/decisions/0009-share-the-brand-as-a-source-only-package.md)

## Context and Problem

The repo held one package, the VS Code extension, at its root. A website, and the brand assets both products share, would mix several products' dependencies, scripts and configs in one place.

## Considered Options

- **A pnpm workspace with `apps/`, `packages/` and `config/`, run by Turborepo**
- The extension at the root with the site as a second package
- A separate repository for the site

## Decision Outcome

Chosen: **a pnpm workspace run by Turborepo**:
```
apps/extension/   the VS Code extension (package `toucan`): src/, test/, scripts/, media/, its manifest
apps/site/        @toucan/site: the website, pre-rendered by React Router; its code is in app/, the framework's convention
packages/<name>/  shared code, `@toucan/<name>`; packages/brand/ holds the brand both products use
config/ts-config/ @toucan/ts-config: the shared compiler options
config/vite/      @toucan/vite-config: the shared Vite and Vitest settings
docs/             ADRs and plans, for the whole repo
scripts/, test/   the root's own tooling: docs search (scripts/qmd), docs-sync, mutate, the ADR log test
(root)            pnpm-workspace.yaml, turbo.json, .oxlintrc.json, .oxfmtrc.json, husky, CI
```
- **Packages** are private and named `@toucan/<name>`; each has its own `lint`, `typecheck` and `test` scripts (and `build` when it builds). The extension keeps the package name `toucan`, because its name is part of the extension ID `marco-daniel.toucan`.
- **Shared code packages are source-only**: `exports` maps `"./*"` to `./src/*`, with no build step; whoever imports them compiles them. Workspace imports go through the package name, relative imports keep their `.ts` extension, and an import names a file, never a barrel (ADR-0010). A package whose assets another package imports maps `"./assets/*"` to them as well, once something imports them. The extension bundles `@toucan/brand` into `dist/extension.cjs`, like its runtime dependencies.
- **Each package writes only into itself, with one exception**: the extension's `font` script writes the glyph SVGs into `packages/brand/assets/glyphs/`. The brand holds the shapes the site shows; the designs, the bake and the font stay with the extension, because VS Code loads the font from inside the extension's folder. A README in that folder says the files are generated, and `check:generated` covers them.
- **The root's own tooling stays at the root**, as the root package's code. It isn't the extension's: it serves the docs of the whole repo. Turborepo runs it as root tasks (`lint:repo`, `typecheck:repo`, `test:repo`), whose inputs include every workspace package and the ADRs, since it imports from the extension, runs on the Vitest base and checks the ADRs cited in every package. `pnpm mutate` (`scripts/mutate-cli.mts`, with its checks in `scripts/mutate.mts`) serves the root and every package that has its own `stryker.config.json` and a `mutate` script, and refuses files outside the package it runs in. Until a shared package holds them, the root tooling and the site import the few helpers they share with the extension (tryCatch, isRecord) from `apps/extension/src/shared/` by path; the site's Stryker config therefore mutates in place.
- **One lint and one format config** at the root, with globs that match at any depth (`**/src/**`). Each package lints itself with `oxlint -c ../../.oxlintrc.json`; oxfmt formats the whole repo from the root.
- **Turborepo** runs `lint`, `typecheck`, `test` and `build` in dependency order. Every task that writes files declares its outputs. The cache lives in each checkout's own `.turbo/` (`cacheDir`), so git worktrees don't share one. Tasks see the whole environment (`envMode: loose`), as they did before.
- ADR-0010 governs the layout inside `apps/extension/src`.

## Consequences

- Good: each product owns its dependencies and gates. Shared code and configs have one home, and new packages fit without reshuffling.
- Bad: paths in docs, scripts and CI grew a prefix. The root tooling reaching into the extension's `src/` is a known shortcut until the helpers move into a shared package.
