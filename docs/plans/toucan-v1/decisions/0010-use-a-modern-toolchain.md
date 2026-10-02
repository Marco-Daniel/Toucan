# 0010. Use a modern toolchain

- Status: Accepted
- Lifted to: [ADR-0004](../../../adr/0004-use-a-modern-toolchain.md)
- Date: 2026-10-01
- Deciders: Marco

## Context and Problem

A typical older extension setup (CJS esbuild script, TS 5.x, npm, no linter, old `engines`) feels outdated. Toucan should be as modern as a VS Code extension allows.

## Considered Options

- Package manager: **pnpm 12 via corepack** / npm / bun
- Bundler: **tsdown** (Rolldown) / esbuild / tsc only
- Lint/format: **oxlint + oxfmt** / ESLint + Prettier / Biome
- Tests: **vitest 5 unit only** / vitest + @vscode/test-cli / none
- Structure: **plain VS Code API** / reactive-vscode
- Typed ids: **vscode-ext-gen** / string literals

## Decision Outcome

Chosen: pnpm 12 (corepack, `packageManager` field), TypeScript 7.0 for typechecking only, tsdown producing a CJS bundle with `vscode` external, oxlint, oxfmt, vitest 5 for the pure modules, vscode-ext-gen for config/command constants, plain VS Code API, `engines.vscode ^1.138.0` (matches `@types/vscode` 1.138), Node 24 (`.nvmrc`).

## Consequences

- Good: fast tooling, typed ids, testable core.
- Bad: oxfmt and tsdown are still 0.x; no integration tests against a real VS Code.
- Follow-ups: keep VS Code-facing modules thin so unit tests cover the logic.
