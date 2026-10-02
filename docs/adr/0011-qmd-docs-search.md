# 0011. qmd docs search is part of the setup

- Status: Accepted
- Date: 2026-10-02
- Deciders: Marco
- Kind: constraint
- Area: docs
- Decided in: [architecture-maintenance/0005](../plans/architecture-maintenance/decisions/0005-require-qmd-docs-search-with-its-own-index.md)

## Context and Problem

Agents working on Toucan need the plans, decisions and guides, and reading whole folders to find them is slow and misses things.

## Considered Options

- **qmd, required**: local keyword and semantic search over the docs through qmd, set up for every contributor.
- **qmd, optional.**
- **No search tool**: read and grep the docs.

## Decision Outcome

Chosen: **qmd, required**. Toucan keeps its docs in its own qmd index, `toucan`, so it never touches a contributor's other collections. Claude Code sessions use it through `.mcp.json`; a session-start hook registers the collections and builds the keyword index, and an edit hook keeps keyword search fresh. `pnpm docs:index` refreshes the embeddings (the first run downloads qmd's models, about 2 GB, once). The extension itself doesn't need qmd, and CI never installs it.

## Consequences

- Good: agents find the right doc first time.
- Bad: one more tool to install, and a large one-time model download.
- The hooks and scripts live in `scripts/qmd/`; ADR-0012 keeps them out of mutation testing.
