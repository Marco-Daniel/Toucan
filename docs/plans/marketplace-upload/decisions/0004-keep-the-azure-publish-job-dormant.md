# 0004. Keep the Azure publish job dormant

- Status: Accepted
- Date: 2026-10-04
- Deciders: Marco

## Context and Problem

publish.yml's `publish` job signs in to Azure. Without the AZURE_* variables it would fail on every release.

## Considered Options

- **Run `publish` only when a switch is on; `verify` still runs on every published release**
- Remove the publish job

## Decision Outcome

Chosen: **dormant**. The job is skipped, not failed, until the repository variable `MARKETPLACE_PUBLISH` is `true`. `verify` still proves each release, and Marco uploads only after it's green.

Implementation note (2026-10-04, agreed with the lead): the switch is a repository variable, not `vars.AZURE_CLIENT_ID`. A job's `if` is evaluated before the job enters its environment, so it can't see the `marketplace` environment's variables, and a check on the client id would skip the job for good. The client and tenant ids stay the environment's.

## Consequences

- Good: the automatic route stays ready; a green verify is the gate.
- Bad: dead code until switched on, documented in ADR-0015.
