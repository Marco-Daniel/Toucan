# Plan: Toucan on the VS Code Marketplace (v1.0.0)

## Goal

Launch Toucan publicly on the Visual Studio Marketplace as **v1.0.0** (→ 0001), published from GitHub Actions with no long-lived secret (→ 0002). Every later release goes to the store automatically, as exactly the file that was released (→ 0003).

## Non-goals

- Open VSX: step 2, in a separate plan (→ 0001).
- Trusted publishing (`vsce --oidc`): the Marketplace doesn't support it yet; adopt it later (→ 0002).
- Changes to the extension's behaviour.

## Approach

**Publishing identity (Marco plus a one-off setup).** The setup steps:
1. A free Azure subscription holds a user-assigned managed identity with **no Azure role**: `allow-no-subscriptions` signs in without one. A Reader role is added only if publishing proves to need it.
2. Its one federated credential trusts only this repo's GitHub environment `marketplace`, in GitHub's immutable subject format. The value is confirmed from a test job's actual token. There are no branch or PR subjects.
3. A one-off workflow run, signed in as the identity, calls `profiles/me` to get its Marketplace member id.
4. Marco adds that id to the `marco-daniel` publisher as Contributor.

The client and tenant ids live in the environment's variables. There are no secrets (→ 0002).

The `marketplace` environment's deployment policy allows `v*` tags only, with admin bypass off. `main` is allowed only for the one-off identity check, then removed, and the check workflow is deleted. Creating a `v*` tag is restricted to Marco in the tag ruleset, so only he can reach the environment.

**Release flow (→ 0004, 0005).**
1. The packaging workflow is split like the site deploy:
   - job `build` has read-only contents plus `id-token`/`attestations` write. It runs every gate, builds the VSIX, generates CHANGELOG.md from the GitHub release notes (→ 0010), attests the VSIX (→ 0005) and uploads it as an artifact;
   - job `release` has only `contents: write`, with no code checkout and no install. It downloads the artifact and creates the **draft** release with the VSIX attached.
3. DevOps fills in the notes per ADR-0013 and publishes the draft under Marco's account.
4. That fires `release: published`.

**Publish job (→ 0003).** It runs on `release: published` in environment `marketplace`, with `id-token: write`, read-only contents and no cache. The order matters, because `azure/login` leaves a session every later step could use:
1. Download the release's VSIX.
2. Verify it:
   - `gh release verify-asset`;
   - the SHA-256 in the notes;
   - `gh attestation verify --repo Marco-Daniel/Toucan --signer-workflow Marco-Daniel/Toucan/.github/workflows/package.yml --source-ref refs/heads/main`.
3. Install vsce exactly as locked: frozen lockfile, filtered to vsce, scripts off. Never `npx` from the registry.
4. Only then sign in with `azure/login` (pinned, `allow-no-subscriptions`).
5. As the last step, run `vsce publish --azure-credential --packagePath <vsix>`.

Nothing is rebuilt, and no repo code runs beyond what these steps need. `Azure/login` joins the actions allowlist, SHA-pinned.

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
