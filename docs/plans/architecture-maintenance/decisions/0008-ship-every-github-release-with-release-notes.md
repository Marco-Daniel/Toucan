# 0008. Ship every GitHub release with release notes

- Status: Accepted
- Date: 2026-10-02
- Deciders: Marco

## Context and Problem

v0.0.1 and v0.0.2 shipped with full notes; this should stay a rule, not depend on who releases.

## Considered Options

- A rule (constraint ADR)
- Leave it to whoever releases

## Decision Outcome

Chosen: a rule: every release has notes covering what's new or changed, install steps, the asset's SHA-256 and links to the PRs, scrubbed for the public repo and signed.

## Consequences

- Good: consistent, verifiable releases
- Bad: slightly more work per release
