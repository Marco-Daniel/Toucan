# 0010. Ship a CHANGELOG.md generated from the release notes

- Status: Accepted
- Date: 2026-10-04
- Deciders: Marco

## Context and Problem

The Marketplace shows a Changelog tab when the package contains CHANGELOG.md. ADR-0013 makes GitHub release notes the record of changes; Marco: "we already keep track of it for releases".

## Considered Options

- **CHANGELOG.md generated from the release notes**
- No changelog
- A hand-kept changelog

## Decision Outcome

Chosen: **generated from the GitHub release notes** (the same source the site's changelog uses), packed into the VSIX, with a check that it's current, so it never drifts from the releases. The 8-file VSIX allowlist grows to 9.

## Consequences

- Good: a complete store page; one source of truth.
- Bad: the packaging must regenerate it per release, and check:vsix changes.

Implementation note (2026-10-04, agreed with the lead): a version's notes don't exist on GitHub until its draft does, and they hold the VSIX's own SHA-256. So the notes are written in the bump PR as `apps/extension/release-notes.md`, with `SHA-256: {{sha256}}` filled in by the packaging workflow; CHANGELOG.md puts that version's part first, then every published release's, and isn't committed. Packaging never falls back to the site's snapshot: it fails when GitHub's releases can't be read. ADR-0015 records the route.
