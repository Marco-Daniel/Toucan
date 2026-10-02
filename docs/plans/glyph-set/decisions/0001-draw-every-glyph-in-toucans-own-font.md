# 0001. Draw every glyph in Toucan's own font

- Status: Accepted
- Date: 2026-10-02
- Deciders: Marco

## Context and Problem

The current glyphs come from two sources: three from Toucan's icon font and five codicons. They differ in size, weight and corner style, and the codicons need a CC BY 4.0 attribution. The new glyphs (toucan, alien, bolt and so on) don't exist as codicons at all, so at least those have to be drawn in Toucan's font anyway.

## Considered Options

- **Redraw all in Toucan's style**: every glyph, including circle, heart and star, in Toucan's font.
- **Mix**: keep the codicons where one exists, draw only the missing ones.
- **Codicons only**: limit the set to what codicons offer.

## Decision Outcome

Chosen: **redraw all in Toucan's style**, because one source gives one consistent look at status bar size, and it was Marco's explicit pick in the brainstorm ("Redraw all in our style").

## Consequences

- Good: a consistent size, weight and baseline. No third-party glyph paths, so the codicon attribution can go. `FALLBACK_ICON` stays a codicon, because it is a built-in icon, not a copied path.
- Bad: 16 shapes to draw and keep up instead of 3.
- Follow-ups: remove the codicon attribution from README and THIRD_PARTY_NOTICES where it covers glyphs.

## Amendment (2026-10-02)

No fallback in code: VS Code gives extensions no signal when a contributed icon font fails to load, so detecting a failure and swapping in a fallback isn't possible; `FALLBACK_ICON` was removed as unused.
