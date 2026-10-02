---
name: docs-sync
description: Finds documentation drift in Toucan since the last run (README.md, GROUNDING.md, .claude/CLAUDE.md, docs/adr/, docs/plans/) and reports each item with a ready fix. Applies nothing until the user approves; approved fixes land through a reviewed PR, and the docs-sync/last tag moves after it merges. Run it by hand every so often. Use --full to sweep every doc instead of the diff.
argument-hint: "[--full]"
---

# docs-sync

The periodic backstop for the CLAUDE.md rule that a change updates every doc that mentions it. It finds what slipped through since the last run: docs that **missed** a change, references that went **stale**, and docs that **contradict** the code. It proposes a fix for each and applies none of them until the user approves (plan: `docs/plans/docs-sync/`).

## 1. Range

1. `git fetch --tags --force origin main`. `--force` takes the tag as another clone last moved it; without it git keeps a stale local `docs-sync/last` and the run diffs from an older one. If the fetch fails, say so once with git's error and carry on from the local refs; call it offline only when `git ls-remote origin` fails too.
2. Run from main as it is on origin: `git switch main && git merge --ff-only origin/main` (skip the merge when the fetch failed). If that fails (local commits on main, uncommitted changes), stop and tell the user: the tag must only ever point at a commit that is on main.
3. Note the **start commit**: `git rev-parse HEAD`. The run covers everything up to it, and the tag later moves here, not to whatever is on main by then.
4. Run `node scripts/docs-sync.mts` (or `--since <ref>` to compare from another ref). It prints JSON: the changed, renamed and removed files, `pnpm` scripts, setting keys, commands, ADR status changes and exported symbols since `docs-sync/last`.
5. **Full sweep** instead of the diff when the user passed `--full`, or when the helper answers `"full": true` (no tag yet, or a shallow clone that can't reach it). Say which, and why.

## 2. Find the mentions

The docs are README.md, GROUNDING.md, .claude/CLAUDE.md, `docs/adr/` and `docs/plans/`. Leave out generated text: the README's settings table (`check:generated` keeps it in sync) and the ADR log's own mechanics (`test/adr.test.ts` checks numbering, the index and citations).

- **Diff run:** for each changed name (a path, an old path, a script, a setting key, a command id, an ADR, a symbol), find where the docs mention it:
  - qmd, always on Toucan's own index: the `qmd` MCP server (it runs `qmd --index toucan`), with `toucan-docs` for `docs/` and `toucan-guides` for README.md and GROUNDING.md, a `lex` line with the exact name and a `vec` line for what it does;
  - plus a plain text search, which also catches what qmd's ranking leaves out: `git grep -nF -e '<name>' -- README.md GROUNDING.md .claude/CLAUDE.md docs`.
  - If qmd isn't available, say so once and continue with the text search alone.
- **Full sweep:** read every doc and check each concrete claim it makes: paths, commands and scripts, setting keys, symbols, file roles and the rules CLAUDE.md states.

## 3. Check each mention against the code

- A path: does it exist (`git ls-files`)? If it moved, where to?
- A `pnpm` script, a setting key or a command id: is it in package.json, and does the doc describe it as it is?
- A symbol: does it exist (`git grep`), and in the file the doc names?
- An ADR: does its status still match what the doc says about it?
- A behaviour: read the code the doc describes; don't guess from names.

Classify each finding:

| Class | Meaning |
|---|---|
| **contradicts** | the doc states something the code doesn't do |
| **stale** | the doc names something that was renamed, moved or removed |
| **missed** | a change no doc reflects where one should (a new `pnpm` script missing from README's development table, say) |

## 4. Propose a fix per item

- **README.md, GROUNDING.md, .claude/CLAUDE.md:** a direct edit. CLAUDE.md stays within its ~80-line budget.
- **An ADR:** an edit for wording only. If the rule itself no longer holds, propose a superseding ADR (the steps are in `docs/adr/README.md`); never rewrite an accepted rule in place.
- **A plan** (`docs/plans/<plan>/`): plans are history, so never rewrite them.
  - A decision that no longer matches the code, where nothing else records why: a dated `## Amendment (YYYY-MM-DD)` note under it, keeping the original text.
  - An open question, or an open item in progress.md or an issue checklist, that is now done: a flag saying where it was done.
- Every proposed edit follows the public-repo rule in CLAUDE.md: no other projects, local paths or session names.

## 5. Report

Group by doc, then by class (contradicts, stale, missed). One block per item, with a short id the user can approve by:

```
### README.md
- [R1] stale · README.md:42 · names `src/core/glyphs.ts`, which moved to `src/features/glyphs/glyphs.util.ts`
  Evidence: git diff --name-status (R100 src/core/glyphs.ts → src/features/glyphs/glyphs.util.ts)
  Fix: `src/core/glyphs.ts` → `src/features/glyphs/glyphs.util.ts`
- [R2] missed · README.md:101 · the new `pnpm foo` script has no row in the development table
  Evidence: package.json "scripts.foo"
  Fix: add `| \`pnpm foo\` | <what it does> |` after the `pnpm mutate` row
```
- Keep each item to its evidence and its fix; one or two lines of evidence are enough.
- End with a count per class and per doc, the start commit, and whether this was a diff run (from which tag) or a full sweep (and why).
- No drift found: say so plainly; the tag can still move (step 7).

## 6. Approval

Apply nothing yet. The user picks the items to apply, by id, or edits a fix first. Items they skip stay unapplied; note them in the PR if they asked to keep them for later.

## 7. Land, then move the tag

1. Branch from main, apply the approved fixes, run the checks, and open a normal PR through the review loop. Its description lists the applied ids and the run's start commit.
2. After that PR merges, the person who ran the skill moves the tag, with the user's explicit OK: `git tag -f docs-sync/last <start commit>` then `git push --force origin refs/tags/docs-sync/last`. That force applies to this one tag only, never to a branch. With no approved fixes, the tag can move right after approval.
3. Never move or push the tag before the fixes are on main: a run isn't done until they are.
