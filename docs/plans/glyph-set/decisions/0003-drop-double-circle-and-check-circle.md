# 0003. Drop double-circle and check-circle

- Status: Accepted
- Date: 2026-10-02
- Deciders: Marco

## Context and Problem

toucan-v1 0012 shipped double-circle and check-circle as codicons. Redrawn in Toucan's style (0001), they add little: double-circle reads as a ring next to circle, and check-circle suggests a status (passed or OK) that Toucan doesn't mean. The 16 places are better spent on the themed groups (0002). Some repos may already be set to either.

## Considered Options

- **Drop both; unknown values fall back to square with a warning**: the existing config path.
- **Keep both** in the Shapes group: Shapes becomes six, or something else goes.
- **Drop both but silently map** them to circle.

## Decision Outcome

Chosen: **drop both and fall back to square with a warning**, because Toucan is at v0.0.1 with almost no installs, and the fallback plus warning already exists in `config.ts`. A silent alias would keep dead names in the schema forever.

## Consequences

- Good: a cleaner set; nothing new needed for the fallback.
- Bad: a repo set to either glyph shows a square until the user picks again.
- Follow-ups: mark toucan-v1 0012's glyph list as superseded by this plan.
