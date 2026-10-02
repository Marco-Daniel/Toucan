# 0021. Import types separately, and group imports by role

- Status: Accepted
- Date: 2026-10-02
- Deciders: Marco

## Context and Problem

Imports mixed inline `type` with separate type imports and had no grouping.

## Considered Options

- Group by origin
- Group by role
- A mix

## Decision Outcome

Chosen: group by role under comment headers, in this order: vscode, libraries (including `node:*`), adapters, utils, views, consts, messages, types. Types always come in through a separate `import type` (lint enforces it), and importing a path twice for values and types is fine. The headers are a CLAUDE.md convention.

## Consequences

- Good: an import block says what a file depends on
- Bad: the header order isn't machine-enforced
