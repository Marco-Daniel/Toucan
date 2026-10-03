# 0010. Deploy to Netlify from GitHub Actions

- Status: Accepted
- Date: 2026-10-03
- Deciders: Marco

## Context and Problem

The pre-rendered site has to reach Netlify (site `toucan-vscode`, created by Marco).

## Considered Options

- **A GitHub Actions workflow with the Netlify CLI**
- Netlify's own Git integration

## Decision Outcome

Chosen: **GitHub Actions**. The workflow builds through Turborepo with the same gates as the rest of CI, then deploys `apps/site`'s static output with the Netlify CLI: production on `main` when the site or a package it depends on changed (`apps/site/**`, `packages/brand/**`, `apps/extension/media/readme/**`), and a preview deploy on pull requests that touch them, with the preview link posted on the PR. The site ID is the repository variable `NETLIFY_SITE_ID`, the token the secret `NETLIFY_AUTH_TOKEN`; both are set. The Netlify site is not linked to Git.

## Consequences

- Good: one CI, one set of gates; deploys only when the site really changed.
- Bad: pull requests from forks get no secrets, so no preview; the token expires and must be renewed.
