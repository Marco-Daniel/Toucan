# 0001. Lift system-shaping decisions into a repo-level ADR log

- Status: Accepted
- Date: 2026-10-02
- Deciders: Marco

## Context and Problem

Decisions so far lived only in plan folders (toucan-v1 0001–0018, glyph-set 0001–0007). Their numbers overlap, so a code comment citing "(0012)" doesn't say which one it means, and decisions that shape the whole system sit next to feature details.

## Considered Options

- Plans stay; system-shaping decisions are lifted into `docs/adr/` with one repo-wide number series
- One log only: every decision goes straight into `docs/adr/`
- Plans only, plus an architecture overview document

## Decision Outcome

Chosen: the first option, because the ADR set then reads as the system while the plan folders keep each feature's history. A lifted plan decision gets a line pointing to its ADR, and code and CLAUDE.md cite only ADR numbers.

## Consequences

- Good: one place to read what the system is; citations that resolve
- Bad: two kinds of decision record to keep apart
- Follow-ups: write the initial ADR set (see plan.md) and note "Lifted to ADR-NNNN" on the source plan decisions
