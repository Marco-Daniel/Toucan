# 0013. Keep Marketplace publishing out of this plan

- Status: Accepted
- Date: 2026-10-03
- Deciders: Marco

## Context and Problem

Marco also wants Toucan on the Visual Studio Marketplace and Open VSX. The site's install section links there.

## Considered Options

- **A separate plan for publishing**
- Publish as part of the site work

## Decision Outcome

Chosen: **separate**. Publishing needs its own setup (publisher account, tokens, a release-workflow step). Until it ships, the site's install section points at the GitHub releases and shows the store links as coming soon.

## Consequences

- Good: the site doesn't wait for publishing, and vice versa.
- Bad: the first site version can't link to a store.
