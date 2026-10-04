# 0003. Publish automatically on a published release

- Status: Accepted
- Date: 2026-10-04
- Deciders: Marco

## Context and Problem

Something has to start a Marketplace publish, and a published version can never be taken back.

## Considered Options

- **Automatically** when a GitHub release is published
- Each publish waits for Marco's approval in the environment

## Decision Outcome

Superseded for now by [marketplace-upload](../../marketplace-upload/plan.md): `publish.yml` verifies every release, and the upload is by hand until trusted publishing.

Chosen: **automatically**, Marco's choice. A workflow on `release: published` downloads the release's VSIX asset, verifies it (`gh release verify-asset`, the SHA-256 in the notes, `gh attestation verify`) and publishes exactly those bytes. Nothing is rebuilt. The release itself is the point of control.

## Consequences

- Good: no extra click; what's published is provably what was released.
- Bad: a mistaken release goes straight to the store; release discipline (ADR-0013) carries that weight.
