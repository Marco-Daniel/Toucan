# Context: Marketplace launch

## What exists (main at planning time)

- **The extension:** `apps/extension`, `marco-daniel.toucan`, version 0.0.4.
  - `pnpm -C apps/extension package` runs `vsce package` with base URLs for the README images.
  - `check:vsix` allows exactly 8 files.
  - `@vscode/vsce` 4.0.0 is installed. It supports `--azure-credential`, `--packagePath` and `--changelog-path` (checked locally).
- **The manifest:**
  - categories `["Other"]`;
  - keywords color, command center, peacock, repository, workspace;
  - galleryBanner `#56915e` dark;
  - no homepage, bugs or qna;
  - icon `media/icon.png`; engines `^1.138.0`.
- **Releases:**
  - GitHub releases with notes per ADR-0013 (what's new, install, SHA-256, PR links, scrubbed, signed);
  - immutable releases are on, and a tag ruleset protects `v*`;
  - `.github/workflows/package.yml` builds the VSIX on `workflow_dispatch` as an artifact; DevOps attaches it to a release.
- **Security posture:**
  - actions are allowlisted (GitHub-owned plus pnpm/action-setup) and SHA-pinned;
  - read-only default token;
  - PRs required on main;
  - secrets only in environments: `production` holds the Netlify token, main only;
  - DevOps publishes and merges with Marco's account through per-command tokens.
- **The publisher:** `marco-daniel` exists on the Marketplace, with Marco as Owner and no extensions.
- **The website's changelog** reads GitHub releases at build time, with a committed fallback. The CHANGELOG generator can share that source.

## Facts checked online (2026-10-04)

- **Global PATs are retired on 1 December 2026,** and publishing PATs must be global. Sources: the Azure DevOps blog; the VS Code publishing guide.
- **The Entra route:**
  - the official guide covers Azure Pipelines: a user-assigned MI with the Reader role, a federated credential, the member id from `https://app.vssps.visualstudio.com/_apis/profile/profiles/me` (resource `499b84ac-1321-427f-aa17-267ca6975798`), and the identity added to the publisher as Contributor;
  - GitHub's own vscode-codeql release workflow uses `azure/login` (v3.x, `allow-no-subscriptions: true`), then `vsce publish --azure-credential --packagePath`;
  - vsce picks up the az CLI session through its credential chain.
- **Trusted publishing:** vsce has a hidden `--oidc`, but the Marketplace endpoint answers "Trusted Publishing is not supported".
- **GitHub OIDC:**
  - environment subjects are `repo:OWNER/REPO:environment:NAME`, but repos created after 15 July 2026 use an immutable format with owner and repo ids. Toucan was created on 2026-10-01, and its sub prefix is `repo:Marco-Daniel@48966669/Toucan@1400615033` (from the repo's OIDC settings, to be confirmed by the identity check);
  - the job needs `id-token: write`.
- **GITHUB_TOKEN** events don't trigger workflows; a release published by a user does.
- **Immutable releases:** assets can't be added after publishing, so publish a draft with its assets already attached.
- **Manifest:**
  - Visualization is a valid category;
  - `qna: false` disables Q&A;
  - keywords are limited to 30 tags;
  - the icon must be a PNG of at least 128 px;
  - CHANGELOG.md is packed and shown as a Changelog section.
- **Attestations:** `actions/attest` v4 needs `id-token: write` and `attestations: write`, is free for public repos, and is verified with `gh attestation verify`.

## Constraints

- No long-lived publishing secret anywhere.
- Every action is SHA-pinned and allowlisted.
- The publish job never rebuilds; it verifies, then publishes the released bytes.
- The repo is public: client and tenant ids are environment variables, not secrets, and nothing from Marco's machine reaches the repo.
