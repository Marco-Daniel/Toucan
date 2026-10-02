# 0006. Only adapters import vscode

- Status: Accepted
- Date: 2026-10-02
- Deciders: Marco
- Kind: constraint
- Area: layout

## Context and Problem

Most of Toucan is logic that doesn't need VS Code: color derivation, config parsing, the colorCustomizations merge, the settings-file edit planner. Code that imports `vscode` can only run inside the extension host, so it can't be unit tested with plain vitest, and a stray import pulls the host into code that otherwise runs anywhere.

## Considered Options

- **Adapters only, by convention**: only `*.adapter.ts` files and `src/core/extension.ts` import `vscode`; everything else is plain TypeScript.
- **A lint rule**: forbid `vscode` imports outside adapters with `no-restricted-imports`.
- **No rule**: import `vscode` where it's convenient.

## Decision Outcome

Chosen: **adapters only, by convention**. The file suffix already says which files talk to VS Code, review checks it, and a grep proves it (`git grep -l 'from "vscode"' src` lists only adapters and the entry point). A lint rule was left out for now: the convention is easy to see and hasn't been broken.

## Consequences

- Good: every `.util.ts`, `.consts.ts`, `.view.ts` and `.messages.ts` file runs in plain vitest; adapters stay thin.
- Bad: nothing enforces it mechanically; a review has to catch a slip.
- A file that turns out to need `vscode` becomes an adapter (and is renamed), rather than gaining the import.
