# 0006. Polish the store page

- Status: Accepted
- Date: 2026-10-04
- Deciders: Marco

## Context and Problem

The manifest only had the category Other and no homepage, issues link or Q&A setting.

## Considered Options

- **The polished set below**
- Leave the manifest as is

## Decision Outcome

Chosen:
- description: "Every repo gets its own color. Know which VS Code window you're in at a glance, without writing a thing into the repo."
- categories: Visualization and Other
- homepage: the website; bugs: GitHub issues; `qna: false` (questions go to issues)
- keywords: the current ones, `peacock` kept, plus multi-root, window, status bar and title bar, within the 30-tag limit including vsce's automatic tags
- banner stays jungle green, dark.

## Consequences

- Good: findable and linked to the site.
- Bad: the keywords need re-checking against the tag limit after packaging.
