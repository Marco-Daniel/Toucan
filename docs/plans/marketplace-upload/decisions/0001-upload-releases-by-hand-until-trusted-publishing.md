# 0001. Upload releases by hand until trusted publishing is live

- Status: Accepted
- Date: 2026-10-04
- Deciders: Marco

## Context and Problem

The launch plan published through Entra ID with a managed identity in an Azure subscription. Creating that subscription, even the free one, requires a credit card, which Marco doesn't have. Global Azure DevOps PATs, the only other automatic route today, stop working on 1 December 2026 and are long-lived secrets. Marketplace trusted publishing (`vsce --oidc`) is built but not enabled yet.

## Considered Options

- **Marco uploads the exact verified release VSIX through his publisher page**
- A debit card for Azure
- A global PAT as a stopgap

## Decision Outcome

Chosen: **upload by hand** for v1.0.0 and later releases, until trusted publishing is live. The release is built, attested and verified by the workflows exactly as before; only the last step, sending the bytes to the Marketplace, is Marco's.

## Consequences

- Good: no Azure, no card, no secret anywhere; the published bytes are still provably the released ones.
- Bad: one manual step per release until trusted publishing.
