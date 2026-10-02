# 0005. Require qmd docs search, with its own index

- Status: Accepted
- Date: 2026-10-02
- Deciders: Marco

## Context and Problem

With ADRs and plans growing, agents loading whole folders costs context. qmd is a local Markdown search engine with an MCP server; its config and index are machine-local and shared across all of a user's projects.

## Considered Options

- Prepare the docs for search and switch qmd on later
- Set qmd up now and make it required
- Do nothing yet

## Decision Outcome

Chosen: set it up now and make it required, because search is much better and saves model load. qmd is a global install (not a devDependency: native modules and about 2 GB of models). `.mcp.json` starts `qmd --index toucan mcp`, and `.claude/settings.json` pre-approves it. Toucan uses its own named index `toucan`, so it never touches the user's other collections: a bare `qmd update` re-indexes and prunes every collection and runs their update commands. The collections are `toucan-docs` (all of `docs/`) and `toucan-guides` (README, GROUNDING). `pnpm docs:index` registers and embeds. A PostToolUse hook re-indexes on doc edits, and a SessionStart hook registers a fresh clone (keyword-only, no model download). Both share one lock in qmd's per-user cache folder. CLAUDE.md tells agents to search through qmd always, subagents too, falling back to reading files only when qmd is unavailable.

## Consequences

- Good: agents find the right docs without loading everything; a fresh clone works without manual steps
- Bad: contributors install qmd once; the first search downloads the models
- Follow-ups: re-index after all maintenance PRs merge (see 0028)
