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
