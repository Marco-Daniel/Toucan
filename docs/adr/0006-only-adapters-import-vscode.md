# 0006. Only adapters import vscode

- Status: Accepted
- Date: 2026-10-02
- Deciders: Marco
- Kind: constraint
- Area: layout
- Decided in: [architecture-maintenance/0017](../plans/architecture-maintenance/decisions/0017-name-files-by-role-and-import-vscode-only-from-adapters.md)

## Context and Problem

Most of Toucan is logic that doesn't need VS Code: color derivation, config parsing, the colorCustomizations merge, the settings-file edit planner. Code that imports `vscode` can only run inside the extension host, so it can't be unit tested with plain vitest, and a stray import pulls the host into code that otherwise runs anywhere.

## Considered Options

- **Adapters only, by convention**: only `*.adapter.ts` files and `src/core/extension.ts` import `vscode`; everything else is plain TypeScript.
- **A lint rule**: forbid `vscode` imports outside adapters with `no-restricted-imports`.
- **No rule**: import `vscode` where it's convenient.

## Decision Outcome

Chosen: **adapters only, by convention**, enforced through CLAUDE.md and review rather than a lint rule. Marco chose this deliberately: the suffix makes the boundary visible, and review checks it with a grep (`git grep -l 'from "vscode"' src` lists only adapters and the entry point).

## Consequences

- Good: every `.util.ts`, `.consts.ts`, `.view.ts` and `.messages.ts` file runs in plain vitest; adapters stay thin.
- Bad: nothing enforces it mechanically; review has to catch a slip.
- A file that turns out to need `vscode` becomes an adapter (and is renamed), rather than gaining the import.
