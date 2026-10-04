# 0006. Switch to trusted publishing when it goes live

- Status: Accepted
- Date: 2026-10-04
- Deciders: Marco

## Context and Problem

Marketplace trusted publishing gives tokenless, automatic publishing from GitHub without Azure. The endpoint answers "not supported" today, and the configuration page is missing.

## Considered Options

- **A follow-up plan when it's live**
- Stay manual

## Decision Outcome

Chosen: **switch when live**. Configure the trusted publisher for this repo and environment, change the publish job's sign-in to `vsce --oidc`, and retire the upload skill.

## Consequences

- Good: fully automatic and secret-free in the end.
- Bad: depends on Microsoft's timing; someone has to notice it's live.
