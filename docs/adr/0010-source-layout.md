# 0010. Source layout: core, shared and features

- Status: Accepted
- Date: 2026-10-02
- Deciders: Marco
- Kind: constraint
- Area: layout
- Decided in: [architecture-maintenance/0016](../plans/architecture-maintenance/decisions/0016-organise-src-as-core-shared-and-features.md), [architecture-maintenance/0017](../plans/architecture-maintenance/decisions/0017-name-files-by-role-and-import-vscode-only-from-adapters.md), [architecture-maintenance/0019](../plans/architecture-maintenance/decisions/0019-use-no-barrel-files.md)

## Context and Problem

`src/` had grown into a flat `src/` plus `src/core/`, where a file's place said little about what it was for or whether it could import `vscode` (ADR-0006).

## Considered Options

- **Topic folders with role suffixes**: `core/`, `shared/<topic>/`, `features/<feature>/`, and a suffix per role.
- **Keep the flat layout.**
- **Folders by kind** (`utils/`, `adapters/`, …).

## Decision Outcome

Chosen: **topic folders with role suffixes**:
- `src/core/`: the entry point and the adapters every part uses.
- `src/shared/<topic>/`: code features share, generic from the start (`shared/` itself holds only folders).
- `src/features/<feature>/`: one folder per feature.
- `src/generated/`: generated code, unchanged.
- Suffixes: `.adapter.ts` (may import `vscode`), `.util.ts`, `.consts.ts`, `.types.ts`, `.view.ts`, `.messages.ts`. camelCase file names.
- No barrel files and no re-exports: an import names the file that defines the symbol, with its `.ts` extension. A test fails on any `export … from` in `src/`.
- `test/` mirrors `src/`.

## Consequences

- Good: a file's path says what it is and what it may import; a feature is one folder.
- Bad: imports get longer, and a file that changes role has to move.
