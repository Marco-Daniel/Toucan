# Progress: Marketplace launch

<!-- Living log. Implementers append newest entries at the top. The planner
     leaves this body empty. Each entry: date, who/what, what changed, what's
     next or blocked. -->

## 2026-10-04: the implementer, launch PR (`marketplace-launch`)

- Did: `packages/releases` (the site's releases fetch and parse, moved; the CHANGELOG renderer) and the extension's `changelog`, `release-notes` and `fill-release-notes` scripts. `package.yml` split into `build` (gates, CHANGELOG, VSIX, SHA-256, attestation) and `release` (the draft). New `publish.yml` on `release: published`. The manifest's description, categories, homepage, bugs, `qna` and keywords; the README opener and the website line; check:vsix at 9 files; ADR-0015, with ADR-0013, ADR-0014 and the README updated.
- Before it, PR #30 adds the temporary identity-check workflow on `main`.
- Next: Marco's Azure setup and the identity check (its run logs deleted after), then the 1.0.0 bump PR: `release-notes.md`, the README's install and status lines, and `marketplace-identity.yml` deleted. Then the store preview, which checks that the README's images load from their `raw/HEAD` URLs as the Marketplace renders them.

## 2026-10-04: the implementer, the site card (`site-marketplace-card`, → 0009)

- Did: Toucan 1.0.0 is on the Marketplace, uploaded by hand (see marketplace-upload). The website's Install section leads with the Marketplace card (link plus `code --install-extension marco-daniel.toucan`), then the GitHub release; Open VSX stays "coming soon". The home section's lead and the docs' getting-started page no longer say "not in the stores yet".
- Checked: site tests, check:pages, and screenshots at 390, 768 and 1280 px. The PR waited until the item page itself answered (the gallery listed 1.0.0 before the page did).
- Next: Open VSX, in a plan of its own (→ 0001).
