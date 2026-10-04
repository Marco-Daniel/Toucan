# Plan: Toucan on the VS Code Marketplace (v1.0.0)

## Goal

Launch Toucan publicly on the Visual Studio Marketplace as **v1.0.0** (→ 0001), published from GitHub Actions with no long-lived secret (→ 0002). Every later release goes to the store automatically, as exactly the file that was released (→ 0003).

## Non-goals

- Open VSX: step 2, in a separate plan (→ 0001).
- Trusted publishing (`vsce --oidc`): the Marketplace doesn't support it yet; adopt it later (→ 0002).
- Changes to the extension's behaviour.

## Approach

**Publishing identity (Marco plus a one-off setup).** The setup steps:
1. A free Azure subscription holds a user-assigned managed identity with the Reader role, scoped to its own resource group.
2. Its federated credential trusts this repo's GitHub environment `marketplace`. The OIDC subject is copied from a test job's actual token, because repos created after 15 July 2026 use GitHub's immutable subject format.
3. A one-off workflow run, signed in as the identity, calls `profiles/me` to get its Marketplace member id.
4. Marco adds that id to the `marco-daniel` publisher as Contributor.

The client and tenant ids live in the environment's variables. There are no secrets (→ 0002).

**Release flow (→ 0004, 0005).**
1. The packaging workflow runs every gate, builds the VSIX, generates CHANGELOG.md from the GitHub release notes (→ 0010) and attests the VSIX's provenance (→ 0005).
2. It creates a **draft** release with the VSIX attached.
3. DevOps fills in the notes per ADR-0013 and publishes the draft under Marco's account.
4. That fires `release: published`.

**Publish job (→ 0003).** It runs on `release: published` in environment `marketplace`, with `id-token: write` and read-only contents:
1. Download the release's VSIX.
2. Verify it: `gh release verify-asset`, the SHA-256 in the notes, and `gh attestation verify` pinned to the packaging workflow.
3. Sign in with `azure/login` (pinned, `allow-no-subscriptions`).
4. Run `vsce publish --azure-credential --packagePath <vsix>`.

Nothing is rebuilt. `Azure/login` joins the actions allowlist, SHA-pinned.

**Store page (→ 0006, 0007, 0008).** The manifest gets:
- the new description;
- the categories Visualization and Other;
- homepage (the website), bugs (GitHub issues) and `qna: false`;
- the extended keywords, within the 30-tag limit including vsce's automatic tags.

"Color-code your VS Code windows…" opens the README and appears on the website. Before release, Marco approves a preview of the header and README as the Marketplace renders them.

**Launch.** Version 1.0.0 goes through a bump PR, then a draft release, then Marco's preview approval. Publishing the release triggers the store publish. After the publish succeeds, the website's Marketplace card links to the store (→ 0009).

## Components

- The packaging workflow: draft release, attestation, CHANGELOG.md, gates.
- The publish workflow (`release: published`, environment `marketplace`).
- A one-off identity-check workflow (prints the OIDC subject, gets the member id), removed or kept disabled after setup.
- Manifest and README changes; the website line; check:vsix allowing CHANGELOG.md (9 files).
- The CHANGELOG generator, shared with the site's releases source.
- The store-page preview.
- Docs: the release steps in the README, an ADR for the publishing route, and an update to ADR-0013 for draft releases.

## Data flow

1. A tag and gates lead to the VSIX plus attestation plus CHANGELOG, in a draft release.
2. Marco publishes the draft, which fires `release: published`.
3. The publish job downloads the asset and verifies it.
4. It exchanges OIDC for Entra and publishes the same bytes to the Marketplace.
5. The site's install card then links to the store.

## Risks

- **OIDC subject mismatch:** the token exchange fails without a clear error. Mitigation: print the real `sub` first; plain environment name.
- **Member id or role wrong:** the publish gets 401/403. Mitigation: the documented `profiles/me` call as the identity; Contributor role.
- **A bad 1.0.0 can't be withdrawn.** Mitigation: Marco's store-page preview; a dry run with `vsce package` and `vsce show` before release.
- **The keyword limit,** once vsce's automatic tags are added. Mitigation: check after packaging.
- **The release trigger:** GITHUB_TOKEN events don't fire workflows. Mitigation: the draft is published as Marco.
- **A new third-party action (`Azure/login`).** Mitigation: SHA-pinned, allowlisted by name, used only in the publish job.

## Open questions

- Whether the Azure portal's GitHub wizard fills in the immutable subject format, or it must be typed by hand.
- Whether Creator is enough instead of Contributor (the official doc says Contributor; use that).
- The minimum VS Code version stated for 1.0.0 (engines `^1.138.0` today).
