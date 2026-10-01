# 0011. Ship as a local VSIX with split CI workflows

- Status: Accepted
- Date: 2026-10-01
- Deciders: Marco

## Context and Problem

Toucan starts as a personal tool in a public repo on Marco's personal account, but should be able to become a published extension later.

## Considered Options

- **Local VSIX now, Marketplace later**
- **VS Code Marketplace now** (needs publisher + PAT)
- **Marketplace + Open VSX now**
- CI: **checks on every push, VSIX via a separate manual workflow** / VSIX artifact on every push

## Decision Outcome

Chosen: **local VSIX** (`code --install-extension`), publisher id `marco-daniel`, public repo, MIT license. GitHub Actions runs lint, format check, typecheck and tests on every push; packaging the VSIX is a separate `workflow_dispatch` workflow.

## Consequences

- Good: no publisher setup now; nothing blocks publishing later.
- Bad: installs and updates are manual.
- Follow-ups: Marketplace publishing workflow when going public.
