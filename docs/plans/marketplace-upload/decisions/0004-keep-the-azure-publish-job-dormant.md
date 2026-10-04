# 0004. Keep the Azure publish job dormant

- Status: Accepted
- Date: 2026-10-04
- Deciders: Marco

## Context and Problem

publish.yml's `publish` job signs in to Azure. Without the AZURE_* variables it would fail on every release.

## Considered Options

- **Run `publish` only when `vars.AZURE_CLIENT_ID` is set; `verify` still runs on every published release**
- Remove the publish job

## Decision Outcome

Chosen: **dormant**. The job is skipped, not failed, while the variables are unset. `verify` still proves each release, and Marco uploads only after it's green.

## Consequences

- Good: the automatic route stays ready; a green verify is the gate.
- Bad: dead code until switched on, documented in ADR-0015.
