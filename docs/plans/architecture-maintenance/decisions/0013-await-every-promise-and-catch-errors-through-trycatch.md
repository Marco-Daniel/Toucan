# 0013. Await every promise and catch errors through tryCatch

- Status: Accepted
- Date: 2026-10-02
- Deciders: Marco

## Context and Problem

The promise rules found 11 floating promises, three of which could really reject unhandled. Error handling was a mix of try/catch, `.catch` and `void`.

## Considered Options

- `void` is enough for fire-and-forget
- `void` plus a reason
- Every promise awaited; tryCatch for failures; no `void`

## Decision Outcome

Chosen: the last: every promise is awaited, and `tryCatch` / `tryCatchSync` (our own Result-tuple helper, which takes a function) is the standard wherever an error is caught, in `src/` and `scripts/`. `try/finally` stays for cleanup. `no-void` is on. The one exception is `notify()`, which deliberately doesn't wait for non-modal notifications (their promise settles only on dismiss).

## Consequences

- Good: failures are always handled or logged; one error-handling shape
- Bad: a small helper to learn
