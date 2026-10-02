# 0004. Use a modern toolchain

- Status: Accepted
- Date: 2026-10-02
- Deciders: Marco
- Kind: background
- Area: tooling

## Context and Problem

A typical older extension setup (a CommonJS esbuild script, TypeScript 5, npm, no linter, an old `engines` range) feels dated. Toucan should be as modern as a VS Code extension allows, with fast tools and a logic core that unit tests can cover.

Lifted from [toucan-v1/0010](../plans/toucan-v1/decisions/0010-use-a-modern-toolchain.md).

## Considered Options

- Package manager: **pnpm via corepack** / npm / bun
- Bundler: **tsdown** (Rolldown) / esbuild / tsc only
- Lint and format: **oxlint + oxfmt** / ESLint + Prettier / Biome
- Tests: **vitest, unit only** / vitest + @vscode/test-cli / none
- Structure: **plain VS Code API** / reactive-vscode
- Typed ids: **vscode-ext-gen** / string literals

## Decision Outcome

Chosen, as it stands now:

- pnpm 12 through corepack (the `packageManager` field), Node 24 (`.nvmrc`).
- TypeScript 7 for typechecking only (`tsc --noEmit`); tsdown builds the CommonJS bundle with `vscode` external.
- oxlint, type-aware through oxlint-tsgolint, with warnings denied and unused disable directives reported; oxfmt for formatting.
- vitest 5 for the modules that don't import `vscode`.
- vscode-ext-gen for config keys and command ids; plain VS Code API, no framework; `engines.vscode ^1.138.0`, matching `@types/vscode`.

## Consequences

- Good: fast tooling, typed ids, a testable core.
- Bad: oxfmt and tsdown are still 0.x; there are no integration tests against a real VS Code.
- Follow-ups: keep the modules that import `vscode` thin, so unit tests cover the logic.
