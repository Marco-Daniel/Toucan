# 0002. Publish with Microsoft Entra ID and a managed identity

- Status: Accepted
- Date: 2026-10-04
- Deciders: Marco

## Context and Problem

`vsce` can publish with an Azure DevOps personal access token or with Microsoft Entra ID. Publishing PATs must be global ("All accessible organizations"), and Azure DevOps retires global PATs on 1 December 2026; the VS Code publishing guide says to move to Entra ID. Trusted publishing (`vsce --oidc`) exists in vsce but the Marketplace answers "Trusted Publishing is not supported" (checked 2026-10-04).

## Considered Options

- **Entra ID with a user-assigned managed identity**, federated with a GitHub environment
- A global PAT now, migrate later
- Wait for trusted publishing

## Decision Outcome

Chosen: **Entra ID with a user-assigned managed identity** in a free Azure subscription. It has no Azure role (Reader only if publishing proves to need it) and one federated credential that trusts only this repo's GitHub environment `marketplace`, in the immutable subject format. The environment allows `v*` tags only (main just for the one-off check), admin bypass is off, and only Marco may create `v*` tags. The publish job signs in with `azure/login` (OIDC, `allow-no-subscriptions`) and runs `vsce publish --azure-credential --packagePath <vsix>`, the pattern GitHub uses for its own CodeQL extension. The identity is a publisher member (Contributor), added by the member id `profiles/me` returns when called as the identity. No long-lived secret exists. When the Marketplace enables trusted publishing, a later plan can switch to it.

## Consequences

- Good: nothing to leak or rotate; works past 1 December 2026.
- Bad: a one-time Azure setup by Marco; `Azure/login` joins the actions allowlist; the OIDC subject must match exactly (see 0004's context and the trail).
