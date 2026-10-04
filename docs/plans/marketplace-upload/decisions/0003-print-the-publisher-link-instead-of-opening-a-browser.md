# 0003. Print the publisher link instead of opening a browser

- Status: Accepted
- Date: 2026-10-04
- Deciders: Marco

## Context and Problem

Marco's default browser is signed in to his work account, which interferes with the Marketplace; he uses a private window for it.

## Considered Options

- **Print the publisher URL in chat; opening a private window is optional**
- Open the default browser

## Decision Outcome

Chosen: **print the link**. Where the browser can be detected (Chrome `--incognito`, Firefox `-private-window`), the skill may offer to open a private window; otherwise it only prints.

## Consequences

- Good: works with Marco's setup.
- Bad: one copy-paste.
