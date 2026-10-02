# 0017. Name files by role, and import vscode only from adapters

- Status: Accepted
- Date: 2026-10-02
- Deciders: Marco

## Context and Problem

"No vscode in core" was prose only, and file names didn't say what a file is.

## Considered Options

- Role suffixes with the VS Code boundary in the name
- Role suffixes plus a vscode/ subfolder per feature
- Minimal suffixes

## Decision Outcome

Chosen: role suffixes: `.adapter`, `.util`, `.types`, `.consts`, `.view`, `.messages`. Only `*.adapter.ts` (and `core/extension.ts`) import `vscode`. That's a constraint ADR and a CLAUDE.md convention, not a lint rule; reviewers check it with a search. File names are camelCase.

## Consequences

- Good: a reader sees from the path what a file is and whether it may touch VS Code
- Bad: the boundary depends on review
