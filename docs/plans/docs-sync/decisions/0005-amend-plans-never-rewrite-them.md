# 0005. Amend plans, never rewrite them

- Status: Accepted
- Date: 2026-10-03
- Deciders: Marco

## Context and Problem

Plan folders are history: a plan was right when it was written, even if the code later moved on.

## Considered Options

- Check only that plan links resolve
- Propose dated amendment notes, and flag open items that are now done
- Edit plans like any other doc

## Decision Outcome

Chosen: dated amendment notes under a decision that no longer matches the code, when nothing else records why; the original text stays. Open questions and progress items that are now done get flagged.

## Consequences

- Good: History stays intact and the record stays truthful.
- Bad: Plans grow amendment notes over time.
