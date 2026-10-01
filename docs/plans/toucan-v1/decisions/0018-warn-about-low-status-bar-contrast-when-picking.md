# 0018. Warn about low status bar contrast when picking a color

- Status: Accepted
- Date: 2026-10-01
- Deciders: Marco

## Context and Problem

The status bar glyph and repo name are drawn in the repo's exact color on the theme's status bar, and in unfocused windows they're the only cue. Some colors are nearly invisible there: the review measured Plumage Black at 1.05:1 on Dark Modern and Beak Yellow at 1.22:1 on Light Modern, and on a classic blue status bar most presets fall below 2:1. The plan listed this as a risk, and 0014 named the darkest and lightest presets.

## Considered Options

- **Warn when picking a color**
- Adjust the glyph's lightness automatically when contrast is too low, keeping the hue
- Accept it and document it

## Decision Outcome

Chosen: **warn when picking.** *Set Color* and *Pick Preset Color* check the chosen color's contrast against the active theme's status bar colors (`statusBar.background`, and `statusBar.noFolderBackground` / `statusBar.debuggingBackground` where relevant). Below about 3:1, they say so: the preset picker marks such colors in its list, and *Set Color* shows the warning before saving. The user can still choose the color. Toucan never changes the color itself.

## Consequences

- Good: the user decides with the information in front of them, and the color stays exactly what they chose everywhere.
- Bad: a color that's fine on one theme can be hard to see after switching themes; the warning only applies at pick time.
**Which status bar color to compare against.** Extensions can't read a theme's resolved colors, only `window.activeColorTheme.kind`. So Toucan uses the user's `workbench.colorCustomizations["statusBar.background"]` when it's set, and otherwise a representative background for the theme kind (the Default Dark Modern and Light Modern status bar colors). Because custom themes can differ, the warning says the color *may* be hard to see on the status bar, and doesn't state a measured ratio. In high-contrast themes VS Code draws status bar items with borders, so Toucan doesn't warn there.

- Follow-ups: revisit if VS Code ever exposes resolved theme colors to extensions.
