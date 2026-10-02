# 0006. Write CLAUDE.md as lean rules plus a library of pointers

- Status: Accepted
- Date: 2026-10-02
- Deciders: Marco

## Context and Problem

Instruction files measurably lower agent success when they're long or generic (arXiv:2602.11988): agents follow every line, so broad mandates make them do more work. A rule earns its place only if it prevents a CI or review failure, is repo-specific, and saves tokens.

## Considered Options

- Enforce in config first; CLAUDE.md only for checkable rules tools can't enforce
- Minimal: commands and guardrails only
- A full standards document

## Decision Outcome

Chosen: a mix of the first two, plus a library: config enforces everything it can, CLAUDE.md holds only checkable rules that tools can't enforce (each one or two lines), and it points the agent to where knowledge lives (when you need X → where → what it holds) without holding that knowledge itself. ADRs hold the reasons. Budget about 80 lines.

## Consequences

- Good: every line is either a rule that prevents a failure or a pointer
- Bad: rules need a home outside CLAUDE.md (config, ADRs)
