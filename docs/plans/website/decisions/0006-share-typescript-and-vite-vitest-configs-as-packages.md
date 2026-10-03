# 0006. Share the TypeScript and Vite/Vitest configs as packages

- Status: Accepted
- Date: 2026-10-03
- Deciders: Marco

## Context and Problem

The extension and the site each need a tsconfig and a Vitest setup; copies would drift.

## Considered Options

- **Config packages**: `@toucan/ts-config` (base, node, react) and `@toucan/vite-config` (Vite and Vitest)
- Only `ts-config` as a package
- Copies per app

## Decision Outcome

Chosen: **both as packages**, as Marco asked. oxlint and oxfmt stay single root configs.

## Consequences

- Good: one place to change compiler and test settings for every package.
- Bad: the extension's tsdown build and the site's Vite build share only what really is common; app-specific settings stay in the app.
