# 0002. Prepare the upload with a repo skill, and let Marco do the upload

- Status: Accepted
- Date: 2026-10-04
- Deciders: Marco

## Context and Problem

A manual upload is easy to get wrong (the wrong file, an unverified file). Automating the upload itself with a browser agent was considered.

## Considered Options

- **A `/marketplace-upload <version>` skill that downloads and verifies, and Marco uploads**
- A Playwright agent that uploads in Marco's logged-in browser session
- A checklist in the README

## Decision Outcome

Chosen: **a skill that prepares, with Marco doing the upload**. The skill:
- downloads the release's VSIX;
- verifies it (`gh release verify-asset`, the SHA-256 in the notes, `gh attestation verify` with publish.yml's pins);
- reports the result and the file's path;
- after the upload, checks that the Marketplace shows the new version, without logging in.

A browser agent was rejected: it would control Marco's Microsoft session (the account behind the publisher), break whenever the page changes, and remove the human check before an irreversible publish.

## Consequences

- Good: about 30 seconds per release; no agent ever touches Marco's account.
- Bad: the skill needs maintenance until trusted publishing makes it obsolete.
