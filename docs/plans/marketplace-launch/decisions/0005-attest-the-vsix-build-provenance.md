# 0005. Attest the VSIX's build provenance

- Status: Accepted
- Date: 2026-10-04
- Deciders: Marco

## Context and Problem

Anyone installing the VSIX, and the publish job itself, should be able to prove where it was built.

## Considered Options

- **actions/attest** on the VSIX where it's built
- SHA-256 in the notes only

## Decision Outcome

Chosen: **actions/attest** (GitHub-owned, free for public repos) in the packaging job, with `id-token: write` and `attestations: write`. The publish job runs `gh attestation verify` before publishing. The SHA-256 stays in the notes (ADR-0013).

## Consequences

- Good: provenance checkable by anyone (`gh attestation verify`).
- Bad: one more permission in the packaging job.
