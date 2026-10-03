# 0007. Split the READMEs by audience

- Status: Accepted
- Date: 2026-10-03
- Deciders: Marco

## Context and Problem

VS Code packages the README from the extension's own folder and shows it on the Marketplace page. Today's root README also carries developer info (scripts, generated configs, the review process) that ends up on the extension page, which bothered Marco.

## Considered Options

- **Two READMEs**: `apps/extension/README.md` for users, the root README for developers
- One root README copied into the package at packaging time

## Decision Outcome

Chosen: **two READMEs**. The extension's README holds what users need (features, commands, settings, screenshots); the root README covers the repo: layout, development, the scripts, how to contribute. The README screenshots (`media/readme/`) move with the extension, and the image links are fixed for vsce's rewrite.

## Consequences

- Good: the Marketplace page shows only user-facing content; developers get a README about the repo.
- Bad: two READMEs to keep in sync with the code; docs-sync checks both.
