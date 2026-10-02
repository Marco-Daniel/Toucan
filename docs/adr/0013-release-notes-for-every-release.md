# 0013. Every release ships GitHub release notes

- Status: Accepted
- Date: 2026-10-02
- Deciders: Marco
- Kind: constraint
- Area: releases
- Decided in: [architecture-maintenance/0008](../plans/architecture-maintenance/decisions/0008-ship-every-github-release-with-release-notes.md)

## Context and Problem

A version bump alone doesn't tell users what changed, and the VSIX doesn't carry a changelog people read.

## Considered Options

- **GitHub release notes for every release.**
- **A CHANGELOG.md only.**
- **Commit history only.**

## Decision Outcome

Chosen: **GitHub release notes for every release**: each released version gets a GitHub release whose notes say what changed for users.

## Consequences

- Good: one place to read what each version changed.
- Bad: one more step in every release.
