# Housekeeping records

Every so often the repo gets a maintenance inspection. Agents look at what changed since the last one (merged PRs, agent sessions, plans and decisions, docs) and at the repo's state (GitHub, plans, decisions, quality checks, rules, loose branches). The maintainer gives a verdict on each finding, and the picks are carried out in one PR.

Each run leaves three files here:

- `<date>.md`, the record: every verdict, the commit or action that carried it out, and the maintainer's answers. It is written before the run's PR opens and not edited after it merges.
- `<date>.html`, the inspection page as it stood at the run's start commit, before the verdicts.
- `<date>.json`, the data that page was drawn from.

The words a record uses:

- **Finding**: one thing the inspection found. Its id (S1, H3, U12) holds for that run only; its **key**, `<check>:<subject>` (for example `finished-plan:docs/plans/website/plan.md`), stays the same across runs.
- **Lane**: the part of the inspection that raised a finding, such as `retro-sessions` (agent sessions), `inspect-plans` (plan health) or `clean-loose-ends` (branches and leftovers).
- **Verdict**: `do` (carry it out), `dismiss` (leave it out of later runs), `later` (ask again next run) or `reviewed` (a decision the maintainer has signed).
- **Watermark**: a git tag, `housekeeping/<part>/last`, that marks where the next run's look at "what changed" starts. It moves to the run's start commit once the record has merged, unless that part was only partly covered or still has an open finding.
- **Carried**: dismissed and done keys kept from earlier records, so they don't come back as new.
