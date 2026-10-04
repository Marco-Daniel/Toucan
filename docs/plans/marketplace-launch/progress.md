# Progress: Marketplace launch

<!-- Living log. Implementers append newest entries at the top. The planner
     leaves this body empty. Each entry: date, who/what, what changed, what's
     next or blocked. -->

## 2026-10-04: the implementer, launch PR (`marketplace-launch`)

- Did: `packages/releases` (the site's releases fetch and parse, moved; the CHANGELOG renderer) and the extension's `changelog`, `release-notes` and `fill-release-notes` scripts. `package.yml` split into `build` (gates, CHANGELOG, VSIX, SHA-256, attestation) and `release` (the draft). New `publish.yml` on `release: published`. The manifest's description, categories, homepage, bugs, `qna` and keywords; the README opener and the website line; check:vsix at 9 files; ADR-0015, with ADR-0013, ADR-0014 and the README updated.
- Before it, PR #30 adds the temporary identity-check workflow on `main`.
- Next: Marco's Azure setup and the identity check, then the 1.0.0 bump PR with `release-notes.md` and the README's install and status lines, then the store preview.
