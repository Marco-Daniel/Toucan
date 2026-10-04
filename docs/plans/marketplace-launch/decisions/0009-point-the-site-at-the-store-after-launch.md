# 0009. Point the website at the store after launch

- Status: Accepted
- Date: 2026-10-04
- Deciders: Marco

## Context and Problem

The site's install cards say "coming soon" for the stores (website/0013).

## Considered Options

- **Switch the Marketplace card to the store link after the publish succeeds**
- Switch it in the launch PR

## Decision Outcome

Chosen: **after the publish succeeds**, so the site never links to a page that doesn't exist yet. Open VSX stays "coming soon" until step 2.

## Consequences

- Good: no dead link.
- Bad: a small follow-up PR right after launch.
