# Housekeeping records

Every so often the repo gets a maintenance inspection. Agents look at what changed since the last one (merged PRs, agent sessions, plans and decisions, docs) and at the repo's state (GitHub, plans, decisions, quality checks, rules, loose branches). The maintainer gives a verdict on each finding, and the picks are carried out in one PR.

Each run leaves three files here:

- `<date>.md`, the record: every verdict, the commit or action that carried it out, and the maintainer's answers. It is written before the run's PR opens, may be amended while that PR is in review, and is not edited after it merges.
- `<date>.html`, the inspection page as it stood at the run's start commit, before the verdicts.
- `<date>.json`, the data that page was drawn from: its blocks, every finding included.

The words a record uses:

- **Finding**: one thing the inspection found. Its id (S1, H3, U12) holds for that run only; its **key**, `<check>:<subject>` (for example `finished-plan:docs/plans/website/plan.md`), stays the same across runs.
- **Group key**: a key ending in `group-<hash>` (for example `merged-branch:group-76e02353`) is one finding about several subjects of one kind; its members are listed in that run's `.json`.
- **Lane**: the part of the inspection that raised a finding; its letter starts the finding's id.
  - Looking back since the last run: `retro-prs` (P, review findings on merged PRs), `retro-sessions` (S, agent sessions), `retro-plans` (D, plans and decision records).
  - Sweeps: `sync-docs` (C, docs that disagree with the code), `clean-loose-ends` (L, branches, worktrees and leftovers), `prune-rules` (R, rules and checks that change nothing).
  - Reports on the current state: `inspect-changes` (what happened since the last inspection), `inspect-github` (PRs, issues, CI, branches), `inspect-plans` (H, plan health), `inspect-decisions` (A, the ADR log and plan decisions; U, decisions to lift into an ADR), `inspect-health` (quality checks over time).
  - Acting on verdicts: `close-plans` (K, a plan to close and, as K<n>.<m>, its open ends) and `lift-decisions` (writes the ADRs).
- **Verdict**: `do` (carry it out), `dismiss` (leave it out of later runs), `later` (ask again next run) or `reviewed` (a decision the maintainer has signed).
- **Watermark**: a git tag, `housekeeping/<part>/last`, that marks where the next run's look at "what changed" starts. It moves to the run's start commit once the record has merged, unless that part was only partly covered or still has an open finding.
- **Carried**: dismissed and done keys kept from earlier records, so they don't come back as new.
- **Ran** and **acted**: the parts that inspected, and the parts that carried out the verdicts.
- **Ref action**: a change to branches or tags (a delete, a prune, an archive tag) rather than a commit.
- **When stored** (in the watermarks line): once the record's PR has merged.
- **Not moved: handed over**: a part whose check was left to the repo's own tooling, so the inspection didn't cover it and its watermark stays.
- **Provisional**: a threshold or window that is a first guess, such as the last 30 days on a first run, to be tuned after more runs.
