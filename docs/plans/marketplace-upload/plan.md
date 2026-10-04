# Plan: Hand upload to the VS Code Marketplace

## Goal

Get v1.0.0, and the releases after it, onto the VS Code Marketplace without an Azure subscription, a card or a secret, as exactly the verified release VSIX (→ 0001). This changes the last step of [marketplace-launch](../marketplace-launch/plan.md); everything before it stays.

## Non-goals

- Automating the upload in a browser (→ 0002).
- Open VSX (still step 2 of the launch).

## Approach

The release flow is unchanged up to the published GitHub release:
1. The bump PR (version plus release-notes.md) merges.
2. package.yml builds, attests and drafts the release.
3. Marco approves the store preview.
4. DevOps publishes the draft under the per-release OK rule.
5. publish.yml's `verify` job proves the asset. Its `publish` job is skipped while the AZURE_* variables are unset (→ 0004).

Then Marco runs `/marketplace-upload <version>` (→ 0002). The skill:
- downloads the release's VSIX;
- verifies it with the same checks as `verify`;
- prints the file path and the publisher link, https://marketplace.visualstudio.com/manage/publishers/marco-daniel. It doesn't open the default browser; at most it offers a private window (→ 0003).

Marco uploads the file in a private window: New extension → Visual Studio Code the first time, Update after that. The skill then confirms the Marketplace serves the new version, through a public, unauthenticated lookup.

The identity check and the environment's temporary main policy are removed (→ 0005). When the Marketplace enables trusted publishing, a follow-up switches to it and retires the skill (→ 0006).

## Components

- `.claude/skills/marketplace-upload/`: the skill (SKILL.md plus a script for the verification), built with the skill-creator guidance, with tests for its pure parts.
- publish.yml: the `publish` job gets `if: vars.AZURE_CLIENT_ID != ''`, so it's skipped, not failed.
- `.github/workflows/marketplace-identity.yml` is deleted.
- Docs:
  - the README's Releasing section gets the manual step and the skill;
  - ADR-0015 says the Entra route is dormant and the upload is manual for now;
  - notes on marketplace-launch's 0002 and 0003.

## Risks

- **Uploading the wrong or an unverified file.** Mitigation: the skill names exactly the file it verified, and the upload follows a green `verify`.
- **The skill touching Marco's account.** Mitigation: it never logs in and only reads public endpoints; the upload is Marco's.
- **Forgetting to switch** when trusted publishing goes live. Mitigation: a roadmap follow-up (→ 0006).

## Open questions

- How to notice that trusted publishing went live. Candidates: watching microsoft/vsmarketplace#1422, or the gallery token endpoint changing its answer.
