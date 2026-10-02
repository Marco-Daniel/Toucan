# 0001. Report drift with a proposed fix for every item

- Status: Accepted
- Date: 2026-10-03
- Deciders: Marco

## Context and Problem

A periodic docs check could stop at a list of problems, propose fixes, or apply fixes itself.

## Considered Options

- A report only
- A report plus a proposed fix per item, applied only after approval
- Apply fixes straight away

## Decision Outcome

Chosen: a report with a ready edit per item. Nothing is applied until Marco approves the items he wants.

## Consequences

- Good: Each finding comes with a concrete fix; nothing changes without a human decision.
- Bad: A run needs a human to approve before anything lands.
