# Context: Architecture maintenance

## What existed before the run

- **Layout.**
  - `src/` held 11 VS Code-facing files, and `src/core/` held 24 pure ones, all in one flat folder. So most features were split across both, with the same name: `focus.ts` in both, `sidebar.ts` in both.
  - `commands.ts` (335 lines) held all five commands and imported 15 modules.
  - All tests sat in `test/core/`.
- **Rules.**
  - `.claude/CLAUDE.md` held the public-repo rule and the test-quality rules.
  - `GROUNDING.md` held the quality commands and conventions, including "pure logic outside vscode" as prose.
  - Decisions lived only in plan folders (`docs/plans/toucan-v1`, `docs/plans/glyph-set`). Their numbers overlapped, and code comments cited them bare, like "(0012)".
- **Tooling.**
  - oxlint 1.86 ran the correctness, suspicious and perf categories with no individual rules. It wasn't type-aware, and CI didn't deny warnings.
  - tsconfig was already strict (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `erasableSyntaxOnly`).
  - oxfmt ran at width 100.
  - There were no git hooks, no CI job timeouts, and no mutation testing.
- **Error handling.** A mix of `try/catch`, `.catch` and `void` fire-and-forget. Several promises floated unhandled.

## Patterns to follow

- TypeScript everywhere. `.ts` and `.mts` run with plain node, imports are explicit `.ts`, and the code is erasable syntax only, so no enums.
- Generated files (`src/generated`, `media/icons`, the font) are written only by scripts and checked by `check:generated`.
- Tests must be able to fail (the CLAUDE.md rules). Expected values are literal, and fakes are able to disagree.
- The repo is public: no local paths, other projects or session names in anything pushed.

## Integration points

- **qmd** is machine-global: one config under `~/.config/qmd` and one index under `~/.cache/qmd`, shared by every project. Toucan uses the named index `toucan` (`toucan.yml` and `toucan.sqlite`), so it never touches other projects' collections.
- **Claude Code** loads the committed `.claude/settings.json` (its hooks and MCP pre-approval) once the folder is trusted, and `.mcp.json` for the MCP server.
- **husky** sets `core.hooksPath` in the clone's shared git config, so the pre-push hook applies to every worktree of a clone.

## Constraints

- dev tooling is POSIX-only (settled in PR #3).
- No Windows support for the qmd tooling.
- Stryker's Vitest runner doesn't work with Vitest 5, so `pnpm mutate` uses the command runner.
