# 0023. Take one object argument by default

- Status: Accepted
- Date: 2026-10-02
- Deciders: Marco

## Context and Problem

Positional parameters make same-typed values easy to swap and every new parameter a change at every call site.

## Considered Options

- Always an object
- An object from two parameters up
- Object by default with named exemptions

## Decision Outcome

Chosen: an object argument by default, typed by a named type (a `<Function>Args` interface next to it, or an existing domain type). Exempt: callbacks whose shape someone else defines, type guards and single-value functions, and single-value port methods. All existing functions were converted. The one documented exception is the glyph geometry helpers in `glyphDesign.consts.ts`, whose positional calls are the design table's notation; any new exception needs the same agreement and a comment.

## Consequences

- Good: extensible call sites without designing options up front
- Bad: longer call sites
