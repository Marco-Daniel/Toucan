# Plan: Docs sync skill

## Goal

A skill, run by hand every once in a while, that finds documentation drift since its last run: changes the docs missed, references that went stale, and docs that contradict the code. It covers README.md, GROUNDING.md, .claude/CLAUDE.md, `docs/adr/` and `docs/plans/`. It's the backstop for the CLAUDE.md rule that a PR updates every doc it affects ([issue #6](https://github.com/Marco-Daniel/Toucan/issues/6)).

## Non-goals

- No automated test or CI check: docs sync stays a rule plus this periodic skill.
- Never applying fixes without approval.
- Never rewriting plan history.
- No first run as part of building it; the first run happens when Marco can approve its fixes.

## Approach

`/docs-sync` lives in the repo at `.claude/skills/docs-sync/` (→ [0003](decisions/0003-keep-the-skill-in-the-repo.md)). A run:

1. **Range.** `docs-sync/last..HEAD` (→ [0002](decisions/0002-mark-the-last-run-with-a-git-tag.md)). With no tag, or with `--full`, it sweeps every doc (→ [0004](decisions/0004-check-the-diff-since-the-last-run-with-a-full-sweep-on-demand.md)).
2. **Extract what changed:** paths, renamed or removed files, `pnpm` scripts, config keys, commands, ADR statuses, and notable exported symbols. Amendment (2026-10-03): it also reads each modified source file's diff for behaviour changes to look up (→ [0004](decisions/0004-check-the-diff-since-the-last-run-with-a-full-sweep-on-demand.md)).
3. **Find mentions:** search qmd (`--index toucan`, `toucan-docs` and `toucan-guides`) plus a plain text search, falling back to the text search alone when qmd is unavailable.
4. **Check each mention** against the current code, and classify each finding as missed, stale or contradicts.
5. **Report**, with a proposed fix per item (→ [0001](decisions/0001-report-drift-with-a-proposed-fix-for-every-item.md)):
   - README, GROUNDING and CLAUDE.md: a direct edit.
   - An ADR: an edit for wording only. If the rule itself no longer holds, a proposed superseding ADR.
   - Plans: a dated amendment note, and a flag for open items that are now done (→ [0005](decisions/0005-amend-plans-never-rewrite-them.md)).
6. **Approval.** The user picks the items to apply.
7. **Land.** The approved fixes go on a branch through a normal PR and the review loop. After it merges, the tag moves to the commit the run covered and is pushed (→ [0006](decisions/0006-land-approved-fixes-through-a-reviewed-pr.md)).

## Components

- **`.claude/skills/docs-sync/SKILL.md`**: the procedure above. It names the tag, the doc set, the classifications, the fix rules per doc type and the report format.
- **A helper script, if extraction is easier mechanically** (e.g. `scripts/docs-sync.mts`): it lists the changed names between two commits. It's pure and unit tested, like the rest of `scripts/`. The judgement, whether a mention is still true, stays in the skill.
- **Docs:**
  - a CLAUDE.md pointer in the docs-sync rule ("run `/docs-sync` every so often")
  - a README development-table row
  - GROUNDING's key skills list, if it has one

## Data flow

1. The tag gives the range.
2. git gives the changed names (from the helper).
3. qmd and the text search give the mentions.
4. The skill checks each mention against the code and writes the report.
5. The user approves items.
6. The approved items go through a PR and the review loop.
7. After merge, the tag moves and is pushed.

## Risks

- **A tag that isn't pushed is lost.** The skill pushes it, and treats a missing tag as "full sweep".
- **Extraction misses a subtle behaviour change.** Accepted; `--full` covers it. Amendment (2026-10-03): a diff run now also reads each modified file's diff for behaviour changes, and its report says what that still misses (→ [0004](decisions/0004-check-the-diff-since-the-last-run-with-a-full-sweep-on-demand.md)).
- **A big report stops being useful.** The skill groups by doc and severity, and caps the detail per item.
- **Wrong fixes.** Every fix is approved by a person and then reviewed in a PR.

## Open questions

- Whether the helper script is worth it, or the skill can do the extraction with git directly: the implementer decides.
- The exact report layout: settle it while writing the skill.
