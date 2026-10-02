# 0016. Organise src as core, shared and features

- Status: Accepted
- Date: 2026-10-02
- Deciders: Marco

## Context and Problem

src/ held the VS Code-facing half of each feature, and src/core/ its pure half, so a feature was split across two folders. Grouping by feature or by layer, as first framed, was rejected.

## Considered Options

- core (extension wiring), shared (feature-independent building blocks), features (one folder each)

## Decision Outcome

Chosen: three kinds of folder, tailored to Toucan: `core/` is the extension's wiring, `shared/<topic>/` holds building blocks that know no feature (every file in a topic folder), and `features/<name>/` holds each feature's VS Code side and pure logic together. Commands are a feature of their own, one file per command.

## Consequences

- Good: a feature lives in one place
- Bad: a large one-time rename diff
