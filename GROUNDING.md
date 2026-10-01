# Grounding

## Plans

- **Path**: `docs/plans`
- **Schema**: 1

## Quality Control

- `pnpm lint` — oxlint
- `pnpm format:check` — oxfmt
- `pnpm typecheck` — TypeScript 7 (`tsc --noEmit`)
- `pnpm test` — vitest
- `pnpm build` — tsdown

## Conventions

- Pure logic outside vscode: color derivation, config parsing and the colorCustomizations merge live in modules that never import `vscode`, and are unit tested with vitest.
- Stable API only by default: no proposed APIs; anything relying on internal behavior (e.g. the emoji/context-key hack) must be opt-in and labelled experimental.
- Typed ids via vscode-ext-gen: config keys and command ids come from the generated constants, never string literals.
- TypeScript everywhere: scripts and configs are .ts/.mts, run with plain node; no .js sources. Relative imports use explicit `.ts` extensions and code stays erasable-only (`erasableSyntaxOnly`: no parameter properties, enums or namespaces) so Node can run any module directly.

## Primary tech + key skills

VS Code extension (`marco-daniel.toucan`): pnpm 12, TypeScript 7, tsdown, oxlint, oxfmt, vitest 5, vscode-ext-gen, culori. Plain VS Code API, no framework.
