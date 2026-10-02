# Grounding

## Plans

- **Path**: `docs/plans`
- **Schema**: 1

## Quality Control

- `pnpm lint` — oxlint, type-aware; every finding is an error
- `pnpm format:check` — oxfmt
- `pnpm typecheck` — TypeScript 7 (`tsc --noEmit`)
- `pnpm test` — vitest
- `pnpm build` — tsdown

## Conventions

- Layout: `src/core` holds the entry point and the adapters every part uses, `src/shared/<topic>` the code features share, and `src/features/<feature>` one folder per feature. `test/` mirrors `src/`. No barrel files: imports name the file.
- File names carry their role: `.adapter.ts`, `.util.ts`, `.consts.ts`, `.types.ts`, `.view.ts` and `.messages.ts`.
- Only adapters touch VS Code: `vscode` is imported only by `*.adapter.ts` files and `src/core/extension.ts`. Everything else (color derivation, config parsing, the colorCustomizations merge and so on) is plain TypeScript, unit tested with vitest.
- Stable API only by default: no proposed APIs; anything relying on internal behavior (e.g. the emoji/context-key hack) must be opt-in and labelled experimental.
- Typed ids via vscode-ext-gen: config keys and command ids come from the generated constants, never string literals.
- TypeScript everywhere: scripts and configs are .ts/.mts, run with plain node; no .js sources. Relative imports use explicit `.ts` extensions and code stays erasable-only (`erasableSyntaxOnly`: no parameter properties, enums or namespaces) so Node can run any module directly.

## Primary tech + key skills

VS Code extension (`marco-daniel.toucan`): pnpm 12, TypeScript 7, tsdown, oxlint, oxfmt, vitest 5, vscode-ext-gen, culori. Plain VS Code API, no framework.
