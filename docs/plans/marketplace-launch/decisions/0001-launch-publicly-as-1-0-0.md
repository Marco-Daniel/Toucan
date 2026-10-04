# 0001. Launch publicly on the VS Code Marketplace as v1.0.0

- Status: Accepted
- Date: 2026-10-04
- Deciders: Marco

## Context and Problem

Toucan has been distributed as a VSIX on GitHub releases (v0.0.1–v0.0.4). With the README showcase and the website live, Marco wants it in the store.

## Considered Options

- **A public launch as v1.0.0** with a polished store page
- A quiet listing (0.0.5) to polish later
- A pre-release first

## Decision Outcome

Open VSX as step 2 is dropped since: Toucan targets VS Code only ([ADR-0016](../../../adr/0016-toucan-is-a-vs-code-extension.md)).

Chosen: **a public launch as v1.0.0**. README, website and extension come together at one version. The VS Code Marketplace comes first; Open VSX (Cursor, VSCodium, Windsurf) is step 2, a separate plan.

## Consequences

- Good: one clear launch moment; the store page matches the site.
- Bad: a Marketplace version can never be reused or removed, only superseded, so 1.0.0 has to be right the first time.
