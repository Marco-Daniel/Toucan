# 0008. Clear Toucan's keys for unconfigured repos

- Status: Accepted
- Date: 2026-10-01
- Deciders: Marco

## Context and Problem

Because colors are written in user scope (0002), a window for a repo without an entry would otherwise keep the previous repo's Command Center color.

## Considered Options

- **Clear Toucan's keys** — theme default, no indicator
- **Automatic color from a hash of the repo name**

## Decision Outcome

Chosen: **clear Toucan's keys**, so unconfigured repos look exactly like plain VS Code.

**Not before first use** (added after the blind review of PR #1): Toucan only starts managing `commandCenter.*` once it has applied a color at least once on this machine, remembered in global state. Until then, focusing a window never clears anything, so Command Center colors the user set by hand stay in place after installing, until they configure their first repo. From then on, Toucan owns the namespace as in 0003.

## Consequences

- Good: no surprising colors; explicit opt-in per repo.
- Bad: each repo needs one setup action.
- Bad: once Toucan has applied a color, hand-set `commandCenter.*` values are gone (0003). The README says this happens at the first applied color, not at install.
