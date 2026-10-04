# Context: Hand upload

- **The launch tooling is on main (#31):**
  - package.yml: check → build → attest → release (draft);
  - publish.yml: `verify` (verify-asset, the SHA-256 in the notes, attestation verify pinned to package.yml on main, a vsce tarball) → `publish` (environment `marketplace`, Azure sign-in, `vsce publish --azure-credential`).
  - ADR-0015 records the publishing route; CHANGELOG.md is generated from the releases.
- **The `marketplace` environment:** `v*` tags only (main removed 2026-10-04), admin bypass off, no variables or secrets.
- **The release rule:** no session publishes a release or creates a `v*` tag without Marco's explicit per-release OK. Only Marco can create `v*` tags (ruleset).
- **The publisher:** `marco-daniel`, with Marco as Owner, empty. The extension ID is `marco-daniel.toucan`.
- **Why no Azure:** creating an Azure subscription requires a credit card, even for the free account.
- **Trusted publishing (2026-10-04):** vsce has a hidden `--oidc`; the Marketplace gallery token endpoint answers "Trusted Publishing is not supported"; there's no configuration page yet.
- **Marco's browser:** the work account in the default browser interferes, so he uses a private window for the Marketplace.
- **gh:** commands run with `GH_TOKEN=$(gh auth token --user Marco-Daniel)`; the work account stays active.
