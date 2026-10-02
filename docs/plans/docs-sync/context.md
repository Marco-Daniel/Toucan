# Context: Docs sync skill

## What exists

- **The docs-sync rule** in `.claude/CLAUDE.md` ("Keep docs in sync"). A PR that changes a command, a path or a behaviour updates every doc that mentions it, in the same PR. A reviewer enforces it; nothing checks it automatically.
- **`test/adr.test.ts`** checks the ADR log mechanically: numbering, headers, the README index, that every cited ADR exists, and that live instructions cite only Accepted ADRs. The skill doesn't need to repeat that.
- **qmd docs search.** The `toucan` named index has `toucan-docs` (all of `docs/`) and `toucan-guides` (README.md, GROUNDING.md), the MCP server comes from `.mcp.json`, and the hooks keep the keyword index fresh. See ADR-0011.
- **The ADR kinds and the supersede steps** are in `docs/adr/README.md`. Plans are history; ADRs are the current rules.
- **Earlier amendments,** for the pattern to follow: `docs/plans/toucan-v1/decisions/0005-…` and `docs/plans/glyph-set/decisions/0001-…` each carry an "Amendment (2026-10-02)" note under the original decision.

## Patterns to follow

- **Scripts:** TypeScript `.mts`, run with plain node, tested under `test/scripts/`, with explicit `.ts` imports.
- **CLAUDE.md conventions:** object arguments, tryCatch, import group headers.
- **The public-repo rule** applies to every report the skill posts to GitHub and every fix it proposes.

## Constraints

- **The dev tooling is POSIX-only.**
- **qmd is required for contributors,** but the skill must work without it, using a text search.
