# 0004. Build releases as drafts and publish them as Marco

- Status: Accepted
- Date: 2026-10-04
- Deciders: Marco

## Context and Problem

Toucan's releases are immutable: assets can't be added after publishing. Events made with the workflow's GITHUB_TOKEN don't start other workflows, so a release published by a workflow wouldn't trigger the publish job.

## Considered Options

- **A draft release with the VSIX and its attestation attached, published under Marco's account**
- Publish the release from the workflow
- Trigger the Marketplace publish by hand

## Decision Outcome

Chosen: **draft, then publish as Marco**. The packaging workflow builds the VSIX, attests it and creates a draft release with the asset. DevOps (or Marco) reviews the notes (ADR-0013) and publishes the draft with Marco's account, which fires `release: published`.

## Consequences

- Good: assets are final before the release locks; the trigger works.
- Bad: the release flow changes; the draft step must be documented.
