# 0009. tryCatch for every caught error

- Status: Accepted
- Date: 2026-10-02
- Deciders: Marco
- Kind: constraint
- Area: errors

## Context and Problem

Errors were caught in several styles: `try/catch` blocks, `.catch()` on promises, and `void` fire-and-forget calls whose failures nobody saw. Each style needs its own reading, and fire-and-forget hides failures.

## Considered Options

- **One Result-tuple helper**: `tryCatch(() => work())` and `tryCatchSync(() => work())` return `[data, null]` or `[null, error]`; callers handle `error !== null`.
- **try/catch everywhere.**
- **A Result library.**

## Decision Outcome

Chosen: **one Result-tuple helper**, `src/shared/async/tryCatch.util.ts`, in `src/` and `scripts/` alike. It takes the work, not a promise, so a synchronous throw while starting it is caught too; a thrown `null` or `undefined` becomes an Error, so the error half never reads as success, and once a caller has handled the error the data is typed as the value. `errorText(error)` shows an error in a message. Every promise is awaited; there's no `void` fire-and-forget.

Exceptions:
- `try/finally` stays for cleanup that must run (a lock or a flag reset).
- `.catch()` stays only on a promise chain nobody awaits, with a comment saying so.
- A non-modal notification goes through `notify()`, which doesn't wait for dismissal.
- A sync event handler or timer with no caller to await hands its work off with a lint disable that states the reason (ADR-0008).

## Consequences

- Good: one way to handle a failure, typed; no unhandled rejections.
- Bad: a small helper every contributor has to know about.
