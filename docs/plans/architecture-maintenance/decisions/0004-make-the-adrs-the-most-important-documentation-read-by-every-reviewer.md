# 0004. Make the ADRs the most important documentation, read by every reviewer

- Status: Accepted
- Date: 2026-10-02
- Deciders: Marco

## Context and Problem

An ADR only works as a guardrail if agents read it and reviewers hold changes to it.

## Considered Options

- CLAUDE.md points to the ADRs, and reviewers check diffs against them
- CLAUDE.md only
- Both, plus rules loaded per folder

## Decision Outcome

Chosen: the first option. CLAUDE.md names the ADRs as the most important documentation and says how each kind applies; since every session loads CLAUDE.md, the review behaviour follows from it. The blind reviewer stays blind to `docs/plans` but reads `docs/adr`, because ADRs are the system's rules, not one PR's intent. A change against an accepted constraint or direction needs a new ADR that supersedes it.

## Consequences

- Good: ADRs are binding without extra machinery
- Bad: reviewers read more per round
- Follow-ups: per-folder rule files can come later, if they're needed
