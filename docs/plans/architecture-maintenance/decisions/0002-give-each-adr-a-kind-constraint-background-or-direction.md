# 0002. Give each ADR a kind: constraint, background or direction

- Status: Accepted
- Date: 2026-10-02
- Deciders: Marco

## Context and Problem

Read together, the ADRs should describe the system as a whole and also where it is heading. Some decisions are binding rules, some are context, and some describe a target the code hasn't reached yet.

## Considered Options

- Guardrails only (all binding)
- Memory only (none binding)
- Both, by kind: constraint (binding), background (context), direction (target)

## Decision Outcome

Chosen: kinds. A direction ADR states its migration as `as touched` (the default: new code follows it, existing code moves when a PR touches it) or `tracked` (when a half-done state does harm or blocks other work; a generated list where a machine can measure it).

## Consequences

- Good: the log can express where the system is going, not only where it is
- Bad: every ADR carries two extra fields
