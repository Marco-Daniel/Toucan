# 0016. Toucan is a VS Code extension

- Status: Accepted
- Date: 2026-10-04
- Deciders: Marco
- Kind: constraint
- Area: distribution
- Decided in: Marco's decision after the 1.0.0 launch, on research into the VS Code-based editors

## Context and Problem

Toucan 1.0.0 is on the Visual Studio Marketplace. The plan had Open VSX as step 2, for the editors built on VS Code that can't use the Marketplace. Checked on 2026-10-04:

- Their VS Code bases are older than Toucan's `engines.vscode` floor of `^1.138.0`: Cursor is on 1.128, Windsurf on 1.126, VSCodium on 1.135. Published as it is, Toucan wouldn't install in any of them.
- They differ where Toucan works: Cursor reserves the secondary sidebar (Toucan's optional sidebar block) and turns the Command Center (where Toucan shows the focused window's color) off by default.

Supporting them would mean lowering the engine floor, testing in each editor, and following their changes.

## Considered Options

- **VS Code only; other editors may install the VSIX from the GitHub releases**
- Open VSX, with the engine floor lowered to the oldest fork
- Open VSX as it is

## Decision Outcome

Chosen: **VS Code only**. Toucan targets VS Code and is published to the Visual Studio Marketplace only, not to Open VSX.

- Other VS Code-based editors (Cursor, Windsurf, VSCodium, Theia and the like) may install the VSIX from the GitHub releases, wherever their VS Code base is recent enough.
- Toucan doesn't generally support them. Reports from them get a best effort, and since an issue seen in another editor often affects VS Code users too, it gets fixed whenever it does.
- The engine floor follows VS Code alone; it isn't lowered to fit a fork.

## Consequences

- Good: one editor to build, test and support; the engine floor and the features (the sidebar block, the Command Center color) follow VS Code.
- Bad: people on Cursor, Windsurf or VSCodium get no store install, and with today's bases the VSIX won't install there either until their bases catch up.
- The website's third install card and the docs say this instead of "Open VSX, coming soon". The 1.0.0 release notes, as published, say "Open VSX … comes next"; this decision supersedes that.
