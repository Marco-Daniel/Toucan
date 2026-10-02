# 0012. Fix lint findings first, and give every ignore a reason

- Status: Accepted
- Date: 2026-10-02
- Deciders: Marco

## Context and Problem

A rule that existing code breaks needs a policy, and ignores tend to become a habit.

## Considered Options

- Fix everything
- Ignore with reasons
- Case by case, fix preferred

## Decision Outcome

Chosen: case by case, fixing where possible. Every ignore states its reason in the comment (`-- reason`), a whole-file ignore is fine where it makes more sense, and reviewers weigh the reason sceptically but raise an ignore only with proof (a simple compliant alternative). oxlint has no rule that enforces the reason, so it's a CLAUDE.md rule for now, with a direction to enforce it through lint once oxlint's `jsPlugins` support leaves alpha.

## Consequences

- Good: rules stay strict without forcing awkward code
- Bad: the reason rule depends on review until jsPlugins is stable
- Follow-ups: enforce ignore reasons through lint once jsPlugins is stable
