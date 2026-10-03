---
name: docs-sync
description: Finds documentation drift in Toucan since the last run (README.md, apps/extension/README.md, GROUNDING.md, .claude/CLAUDE.md, docs/adr/, docs/plans/) and reports each item with a ready fix. Applies nothing until the user approves; approved fixes land through a reviewed PR, and the docs-sync/last tag moves after it merges. Run it by hand every so often. Use --full to sweep every doc instead of the diff.
argument-hint: "[--full]"
---

# docs-sync

The periodic backstop for the CLAUDE.md rule that a change updates every doc that mentions it. It finds what slipped through since the last run: docs that **missed** a change, references that went **stale**, and docs that **contradict** the code. It proposes a fix for each and applies none of them until the user approves (plan: `docs/plans/docs-sync/`).

## 1. Range

1. `git fetch --tags --force origin main`. `--force` takes the tag as another clone last moved it; without it git keeps a stale local `docs-sync/last` and the run diffs from an older one. If the fetch fails, say so once with git's error and carry on from the local refs; call it offline only when `git ls-remote origin` fails too.
2. Run on main as it is on origin. `git status --porcelain` must print nothing; otherwise stop and tell the user, because the run would read uncommitted work. Then `git switch --detach origin/main`: it touches no branch, and works in a worktree while main is checked out elsewhere. If the fetch failed, say the run starts from the last known `origin/main`. Afterwards, `git switch -` returns the user to where they were.
3. Note the **start commit**: `git rev-parse HEAD`, which is now a commit on main. The run covers everything up to it, and the tag later moves here, not to whatever is on main by then.
4. Run `node scripts/docs-sync.mts` (or `--since <ref>` to compare from another ref). It prints JSON with what changed since `docs-sync/last`: files (added, removed, renamed, modified), `pnpm` scripts of every package.json (the root's by name, a package's as `<name>#<script>`, e.g. `toucan#check:vsix`), setting keys added, removed or redefined, command ids added or removed and commands retitled (their palette label, `Category: Title`), ADR statuses and exported symbols.
5. **Full sweep** instead of the diff when the user passed `--full`, or when the helper answers `"full": true` (no tag yet, or a shallow clone that can't reach it). Say which, and why.

## 2. Find the mentions

The docs are README.md, apps/extension/README.md, GROUNDING.md, .claude/CLAUDE.md, `docs/adr/` and `docs/plans/`. Leave out generated text: the extension README's settings table (`check:generated` keeps it in sync) and the ADR log's own mechanics (`test/adr.test.ts` checks numbering, the index and citations).

- **Diff run, names:** for each changed name (a path, an old path, a script, a setting key, a command id, an ADR, a symbol), find where the docs mention it. For a retitled command (`commands.retitled`), search its id, its old label and its old bare title (docs may quote either form). For a script, search its bare name (docs write `pnpm -C apps/extension check:vsix`, not `toucan#check:vsix`). For a changed setting (`settings.changed`), search its key and its old default and enum values, from `git diff <since> HEAD -- apps/extension/package.json`.
- **Diff run, behaviour:** a change can make a doc false without renaming anything (a branch made unconditional, a default flipped). For each modified or renamed file under `apps/extension/src/`, `apps/extension/scripts/` and `scripts/`, and for `apps/extension/package.json`, read its diff: `git diff <since> HEAD -M -- <path>`. State each behaviour change in one line ("choosing _Not now_ no longer stops the prompt", say), and search the docs for that sentence as well as for the user-facing strings, titles and setting keys the hunks touch. Skip pure refactors, and say how many files you skipped that way.
- How to search, for a name or a behaviour:
  - qmd, always on Toucan's own index: the `qmd` MCP server (it runs `qmd --index toucan`), with `toucan-docs` for `docs/` and `toucan-guides` for the READMEs and GROUNDING.md, a `lex` line with the exact name or string and a `vec` line for what it does (for a behaviour change, its one-line statement);
  - plus a plain text search, which also catches what qmd's ranking leaves out: `git grep -nF -e '<name or string>' -- README.md apps/extension/README.md GROUNDING.md .claude/CLAUDE.md docs`.
  - If qmd isn't available, say so once and continue with the text search alone.
- **Full sweep:** read every doc and check each concrete claim it makes: paths, commands and scripts, setting keys, symbols, file roles and the rules CLAUDE.md states.

## 3. Check each mention against the code

- A path: does it exist (`git ls-files`)? If it moved, where to?
- A `pnpm` script, a setting key or a command id: is it in its package's package.json, and does the doc describe it as it is now (a command's title, a setting's default, options and scope)?
- A symbol: does it exist (`git grep`), and in the file the doc names?
- An ADR: does its status still match what the doc says about it?
- A behaviour: read the code the doc describes; don't guess from names.

Classify each finding:

| Class | Meaning |
|---|---|
| **contradicts** | the doc states something the code doesn't do |
| **stale** | the doc names something that was renamed, moved or removed |
| **missed** | a change no doc reflects where one should (a new `pnpm` script missing from the root README's development tables, say) |

## 4. Propose a fix per item

- **README.md, apps/extension/README.md, GROUNDING.md, .claude/CLAUDE.md:** a direct edit. CLAUDE.md stays a short set of rules with pointers, about 80 lines (`docs/plans/architecture-maintenance/decisions/0006-write-claude-md-as-lean-rules-plus-a-library-of-pointers.md`): put detail in the doc it points to.
- **An ADR:** an edit for wording only. If the rule itself no longer holds, propose a superseding ADR (the steps are in `docs/adr/README.md`); never rewrite an accepted rule in place.
- **A plan** (`docs/plans/<plan>/`): plans are history, so never rewrite them.
  - A decision that no longer matches the code, where nothing else records why: a dated `## Amendment (YYYY-MM-DD)` note under it, keeping the original text.
  - An open question, or an open item in progress.md or an issue checklist, that is now done: a flag saying where it was done.
- Every proposed edit follows the public-repo rule in CLAUDE.md: no other projects, local paths or session names.

## 5. Report

Group by doc, then by class (contradicts, stale, missed). One block per item, with a short id the user can approve by:

```
### README.md
- [R1] stale · README.md:42 · names `apps/extension/src/core/glyphs.ts`, which moved to `apps/extension/src/features/glyphs/glyphs.util.ts`
  Evidence: git diff --name-status (R100 apps/extension/src/core/glyphs.ts → apps/extension/src/features/glyphs/glyphs.util.ts)
  Fix: `apps/extension/src/core/glyphs.ts` → `apps/extension/src/features/glyphs/glyphs.util.ts`
- [R2] missed · README.md:101 · the new `pnpm foo` script has no row in the development table
  Evidence: apps/extension/package.json "scripts.foo"
  Fix: add `| \`pnpm foo\` | <what it does> |` after the `mutate` row
```
- Keep each item to its evidence and its fix; one or two lines of evidence are enough.
- End with a count per class and per doc, the start commit, and whether this was a diff run (from which tag) or a full sweep (and why).
- A diff run's report ends with its limit: "Behaviour changes the diff reading doesn't describe can still be missed; run `/docs-sync --full` every so often."
- No drift found: say so plainly; the tag can still move (step 7).

## 6. Approval

Apply nothing yet. The user picks the items to apply, by id, or edits a fix first. Items they skip stay unapplied; note them in the PR if they asked to keep them for later.

## 7. Land, then move the tag

1. Branch from main, apply the approved fixes, run the checks, and open a normal PR through the review loop. Its description lists the applied ids and the run's start commit.
2. After that PR merges, the person who ran the skill moves the tag, with the user's explicit OK: `git tag -f docs-sync/last <start commit>` then `git push --force origin refs/tags/docs-sync/last`. That force applies to this one tag only, never to a branch. With no approved fixes, the tag can move right after approval.
3. Never move or push the tag before the fixes are on main: a run isn't done until they are.
