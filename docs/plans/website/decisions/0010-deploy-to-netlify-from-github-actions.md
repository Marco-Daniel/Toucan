# 0010. Deploy to Netlify from GitHub Actions

- Status: Accepted
- Date: 2026-10-03
- Deciders: Marco

## Context and Problem

The pre-rendered site has to reach Netlify (site `toucan-vscode`, created by Marco).

## Considered Options

- **A GitHub Actions workflow with the Netlify CLI, deploying only from `main`**
- The same workflow with preview deploys on pull requests
- Preview deploys behind a manual approval per pull request
- Netlify's own Git integration

## Decision Outcome

Chosen: **GitHub Actions, deploying only from `main`**. The workflow builds through Turborepo with the same gates as the rest of CI, then deploys `apps/site`'s static output with the Netlify CLI when the site or a package it depends on changed (`apps/site/**`, `packages/brand/**`, `apps/extension/media/readme/**`).

The repo is public, so the token is guarded so that nothing but a `main` deploy can read it (Marco: security comes first, and DevOps carries the responsibility for the repo's secrets and actions):
- `NETLIFY_AUTH_TOKEN` lives in a GitHub environment `production` that only the `main` branch may use. It is not a repository secret.
- The deploy job declares `environment: production` and runs only on `push` to `main` or `workflow_dispatch` from `main`, never on `pull_request`.
- The job has `permissions: contents: read`, and the Netlify CLI is pinned to an exact version.
- No preview deploys. Reviewers check the site with a local build and the three-width screenshots (0012).

The site ID is the repository variable `NETLIFY_SITE_ID`. The Netlify site is not linked to Git.

## Consequences

- Good: one CI, one set of gates; deploys only when the site really changed.
- Good: a workflow change on a branch or in a pull request can't read the token.
- Bad: no preview links on pull requests; the token expires and must be renewed.
