# 0015. Release through attested drafts and publish to the Marketplace from Actions

- Status: Accepted
- Date: 2026-10-04
- Deciders: Marco
- Kind: constraint
- Area: releases
- Decided in: [marketplace-launch/0002](../plans/marketplace-launch/decisions/0002-publish-with-entra-id-and-a-managed-identity.md), [marketplace-launch/0003](../plans/marketplace-launch/decisions/0003-publish-automatically-on-a-published-release.md), [marketplace-launch/0004](../plans/marketplace-launch/decisions/0004-build-releases-as-drafts-and-publish-them-as-marco.md), [marketplace-launch/0005](../plans/marketplace-launch/decisions/0005-attest-the-vsix-build-provenance.md), [marketplace-launch/0010](../plans/marketplace-launch/decisions/0010-ship-a-changelog-from-the-release-notes.md)

## Context and Problem

Toucan goes on the VS Code Marketplace. Publishing with a personal access token means a long-lived secret, and global tokens, which publishing needs, are retired on 1 December 2026. A release also has to reach the store as exactly the file people can download from GitHub, and the store page should carry a changelog.

## Considered Options

- **Attested draft releases, published to the Marketplace by a workflow that signs in with OIDC**
- A personal access token in a secret, publishing by hand
- Rebuilding the VSIX in the publishing job

## Decision Outcome

Chosen: **attested drafts, published from Actions with no secret**:

- **The notes are written first.** Each release's notes (ADR-0013) are written in its bump PR, as `apps/extension/release-notes.md`, with `SHA-256: {{sha256}}` where the VSIX's checksum goes. They're reviewed like any change.
- **`package.yml` builds the release from `main`**, in four jobs, each with only the rights it needs. `check` (read-only) runs every gate. `build` (read-only) writes CHANGELOG.md from this version's notes and every published release's (never from a snapshot: it fails instead), packages and checks the VSIX, and fills in the SHA-256. `attest` (`id-token` and `attestations`, no checkout, no install) signs the VSIX's build provenance. `release` (only `contents: write`; no checkout, no install) refuses a version that already has a release or draft, then creates a **draft** release with that VSIX and those notes.
- **Marco publishes the draft.** A release published by a person fires `release: published`, and creating its `v*` tag is restricted to him.
- **`publish.yml` publishes exactly the released file**, in two jobs. `verify`, which can't mint an OIDC token, downloads the release's VSIX and checks it (`gh release verify-asset`, the SHA-256 in the notes, `gh attestation verify` for `package.yml` on `main`), installs vsce from the lockfile with scripts off, and hands both on as files with their SHA-256s. `publish`, in the `marketplace` environment, which admits only `v*` tags, has no checkout and installs nothing: it checks both files' SHA-256s, signs in with `azure/login` as a managed identity (OIDC, no subscription) and runs that vsce's `publish --azure-credential --packagePath --skip-duplicate`. Nothing is rebuilt.
- **No secret exists.** The identity's client and tenant ids are the environment's variables; its federated credential trusts only that environment.

## Consequences

- Good: no publishing secret to leak or rotate, and the store, the GitHub release and the attestation all name the same bytes. The changelog can't drift from the releases.
- Bad: a release needs Marco to publish it, an Azure tenant holds the identity, and the notes are written before the VSIX exists. When the Marketplace supports trusted publishing, the identity can go.
