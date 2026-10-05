# 0005. Release it as v1.1.0

- Status: Accepted
- Date: 2026-10-05
- Deciders: Marco

## Context and Problem

The block moves for every user who has it on, and a setting value stops working. That's a visible change in behaviour, not a fix.

## Considered Options

- **v1.1.0 (minor)**
- v1.0.1 (patch)

## Decision Outcome

Chosen: **v1.1.0**, through the usual route: a bump PR with `release-notes.md` (ADR-0013) and a review round, the draft release, Marco's per-release OK to DevOps to publish it, then `/marketplace-upload 1.1.0` and Marco's hand upload (marketplace-upload/0001), then the site's releases.json snapshot.

## Consequences

- Good: the version tells users something changed; the notes say where the block went and that `unfocused` is gone.
