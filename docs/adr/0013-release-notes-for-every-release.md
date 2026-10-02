# 0013. Every release ships GitHub release notes

- Status: Accepted
- Date: 2026-10-02
- Deciders: Marco
- Kind: constraint
- Area: releases
- Decided in: [architecture-maintenance/0008](../plans/architecture-maintenance/decisions/0008-ship-every-github-release-with-release-notes.md)

## Context and Problem

A version bump alone doesn't tell users what changed, and the VSIX doesn't carry a changelog people read. v0.0.1 and v0.0.2 shipped with full notes; that should stay a rule, not depend on who releases.

## Considered Options

- **GitHub release notes for every release.**
- **A CHANGELOG.md only.**
- **Commit history only.**

## Decision Outcome

Chosen: **GitHub release notes for every release**. Every release's notes have:

- what's new or changed, for users;
- install steps;
- the VSIX asset's SHA-256, so a download can be verified;
- links to the PRs it contains;

and they are scrubbed for the public repo (no other projects, local paths or session names) and signed.

## Consequences

- Good: one place to read what each version changed, and each release can be checked against the list above.
- Bad: one more step in every release.
