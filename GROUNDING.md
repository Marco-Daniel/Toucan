# Grounding

## Plans

- **Path**: `docs/plans`
- **Schema**: 1
- **Status**: every plan.md carries `Status: Live` or `Status: Closed YYYY-MM-DD` under its title. Closing a plan adds a dated note at the top of its progress.md that gives every open end a fate: a ticket, dropped with the reason, or answered with where.
- **Edits**: plans are history: amend them with dated notes, never rewrite them ([ADR-0019](docs/adr/0019-amend-plans-never-rewrite-them.md)). The repo's maintenance also adds a plan.md's `Status:` line, a closing entry at the top of its progress.md, and, on a decision lifted to an ADR, one appended line: `Lifted to ADR-NNNN (YYYY-MM-DD): <link to the ADR>`.

## Quality Control

Run from the root; Turborepo runs lint, typecheck, test and build in every package, and format:check covers the whole repo.

pnpm comes through corepack (`packageManager` in package.json): run `corepack enable pnpm` once, so Turborepo finds `pnpm` on PATH (README, Development); until then, use `corepack pnpm`.

- `pnpm lint` — oxlint, type-aware; every finding is an error
- `pnpm format:check` — oxfmt
- `pnpm typecheck` — TypeScript 7 (`tsc --noEmit`)
- `pnpm test` — vitest
- `pnpm build` — tsdown (the extension)

## Conventions

- Monorepo (pnpm workspace with Turborepo): `apps/extension` is the extension, `apps/site` (`@toucan/site`) the website, `packages/brand` (`@toucan/brand`) the shared brand (presets, color tokens, glyph names and SVGs, icon and logo), `packages/releases` (`@toucan/releases`) Toucan's GitHub releases for the site's changelog and the extension's CHANGELOG.md, `config/ts-config` and `config/vite` hold the shared TypeScript and Vite/Vitest settings, and `docs/` the ADRs, the plans and the housekeeping records. The root holds the workspace configs and the repo's own tooling in `scripts/` and `test/` (qmd docs search, mutate, the marketplace-upload helper).
- Extension layout: `apps/extension/src/core` holds the entry point and the adapters every part uses, `apps/extension/src/shared/<topic>` the code features share, and `apps/extension/src/features/<feature>` one folder per feature. `apps/extension/test/` mirrors `apps/extension/src/`. No barrel files: imports name the file.
- File names carry their role: `.adapter.ts`, `.util.ts`, `.consts.ts`, `.types.ts`, `.view.ts` and `.messages.ts`.
- Only adapters touch VS Code: `vscode` is imported only by `*.adapter.ts` files and `apps/extension/src/core/extension.ts`. Everything else (color derivation, config parsing, the colorCustomizations merge and so on) is plain TypeScript, unit tested with vitest.
- Stable API only by default: no proposed APIs; anything relying on internal behavior (e.g. the emoji/context-key hack) must be opt-in and labelled experimental.
- Typed ids via vscode-ext-gen: config keys and command ids come from the generated constants, never string literals.
- TypeScript everywhere: scripts and configs are .ts/.mts, run with plain node; no .js sources. Relative imports use explicit `.ts` extensions and code stays erasable-only (`erasableSyntaxOnly`: no parameter properties, enums or namespaces) so Node can run any module directly.

## Primary tech + key skills

VS Code extension (`marco-daniel.toucan`): pnpm 12, TypeScript 7, tsdown, oxlint, oxfmt, vitest 5, vscode-ext-gen, culori. Plain VS Code API, no framework. Repo skill: `/marketplace-upload` (`.claude/skills/marketplace-upload/`) verifies a published release's VSIX for a manual Marketplace upload.

## Housekeeping

- **Inspection record**: repo `docs/housekeeping`
- **ADRs**: `docs/adr`
- **Board**: GitHub Project `Marco-Daniel/4`
- **Human-judgement label**: `hitl`
