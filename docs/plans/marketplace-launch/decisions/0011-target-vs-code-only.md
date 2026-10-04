# 0011. Target VS Code only

- Status: Accepted
- Date: 2026-10-04
- Deciders: Marco

## Context and Problem

After the 1.0.0 launch on the Visual Studio Marketplace, Open VSX was step 2 (→ 0001), for the editors built on VS Code that can't use the Marketplace. Checked on 2026-10-04:

- Their VS Code bases are older than Toucan's `engines.vscode` floor of `^1.138.0`: Cursor 1.128, Windsurf 1.126, VSCodium 1.135. Toucan as it is wouldn't install in any of them.
- Cursor reserves the secondary sidebar (Toucan's optional sidebar block) and turns the Command Center (the focused window's color) off by default.

## Considered Options

- **VS Code only; other editors may install the VSIX from the GitHub releases**
- Open VSX, with the engine floor lowered to the oldest fork
- Open VSX as it is

## Decision Outcome

Chosen: **VS Code only**. Marco: "Toucan is a VS Code extension; other editors may install the VSIX from GitHub releases; best-effort support; we fix what also affects VS Code", dropping Open VSX. Lifted to [ADR-0016](../../../adr/0016-toucan-is-a-vs-code-extension.md).

## Consequences

- Good: one editor to build, test and support; the engine floor and the features follow VS Code.
- Bad: no store install for Cursor, Windsurf or VSCodium, and with today's bases the VSIX won't install there either.
- The site's third install card, the docs and the extension README say so. The published 1.0.0 notes still say "Open VSX … comes next"; this supersedes them.
