# 0003. Ship a landing page, docs and a changelog

- Status: Accepted
- Date: 2026-10-03
- Deciders: Marco

## Context and Problem

How much should the first version of the site contain?

## Considered Options

- **Landing page, docs (one page per feature) and a changelog from the GitHub releases**
- A single landing page
- Landing page and changelog

## Decision Outcome

Chosen: **landing, docs and changelog**. That is the usual shape of a VS Code extension site, and it gives the user-facing explanations a home outside the README (0007). Docs pages: colors, presets, glyphs, the sidebar, the search emoji, settings, commands. The changelog is built at build time from the GitHub releases, which already carry full notes (ADR-0013).

## Consequences

- Good: users find docs and release history on the site.
- Bad: more pages to keep true; docs-sync covers the site's pages too.
