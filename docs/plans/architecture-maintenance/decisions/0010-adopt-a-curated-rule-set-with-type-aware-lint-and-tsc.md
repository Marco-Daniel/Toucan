# 0010. Adopt a curated rule set, with type-aware lint and tsc

- Status: Accepted
- Date: 2026-10-02
- Deciders: Marco

## Context and Problem

Toucan's oxlint turned on whole categories only. A curated set adds about 30 hand-picked rules, plus type-aware rules through oxlint-tsgolint.

## Considered Options

- Start from a curated, proven rule set and adjust
- Turn on more whole categories
- Pick rules one by one

## Decision Outcome

Chosen: start from a curated non-React rule set, adjusted to Toucan: correctness, suspicious and perf as error, `no-floating-promises` with `ignoreVoid: false`, `no-void`, `no-magic-numbers` ignoring -1, 0 and 1 (named constants otherwise), and `no-restricted-imports` fencing `src/` from `scripts/` and `test/`. Type-aware lint uses `oxlint-tsgolint`. Type-checking stays `tsc --noEmit` (oxlint's `--type-check` is experimental), with `noImplicitReturns`, `noUnusedLocals`, `noUnusedParameters` and `noPropertyAccessFromIndexSignature` added.

## Consequences

- Good: a professional baseline that catches real bugs (floating promises)
- Bad: a new devDependency; more findings to fix up front
