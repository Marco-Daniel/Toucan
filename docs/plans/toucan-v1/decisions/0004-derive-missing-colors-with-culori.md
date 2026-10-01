# 0004. Derive missing colors with culori

- Status: Accepted
- Date: 2026-10-01
- Deciders: Marco

## Context and Problem

Only `background` is required. Foreground, hover, border and inactive variants must look right in every state without the user specifying them, and any key may still be overridden.

## Considered Options

- **culori** — parse any CSS color, convert, OKLCH math, WCAG contrast
- **Hand-rolled OKLCH** — ~60 lines, zero dependencies, hex input only
- **Only background + foreground** — hover/inactive fall back to the theme, may look inconsistent

## Decision Outcome

Chosen: **culori**, with tree-shakable function imports. Rules: foreground = black or white by higher WCAG contrast; `activeBackground` = background shifted ~0.06 OKLCH lightness (lighter on dark, darker on light); `border` = ~0.12 shift; `activeForeground`/`activeBorder` = foreground/border; `inactiveForeground` ≈ 60% alpha; `inactiveBorder` ≈ 50% alpha. Overrides win and derivation builds on them. Input: anything culori parses; output: hex.

## Consequences

- Good: perceptually even results; flexible input.
- Bad: a runtime dependency in the bundle.
- Follow-ups: tune the amounts visually once it runs.
