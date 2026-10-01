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

**Not before first use** (added after the blind review of PR #1): Toucan only starts managing `commandCenter.*` once it has applied a color at least once in this VS Code profile, remembered in global state (which is per profile). Until then, focusing a window never clears anything, so Command Center colors the user set by hand stay in place after installing, until they configure their first repo. From then on, Toucan owns the namespace as in 0003.

## Consequences

- Good: no surprising colors; explicit opt-in per repo.
- Bad: each repo needs one setup action.
- Bad: with profiles that share settings but not global state, a profile that never applied a color also never clears, so a leftover color from another profile stays in its windows until a window of a profile that has applied colors takes focus. The README's profile note mentions it.
- Bad: once Toucan has applied a color, hand-set `commandCenter.*` values are gone (0003). The README says this happens at the first applied color, not at install.
