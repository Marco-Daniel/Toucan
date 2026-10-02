# Toucan

**Ground:** Repo facts are in [GROUNDING.md](../GROUNDING.md)

## This repo is public

Everything pushed to GitHub is public: files, commit messages, branch names, PR and issue text, review comments and CI logs. None of that may contain:

- references to other projects or repositories of the owner, or where an idea was borrowed from (describe the idea itself)
- local machine details: absolute paths (home folders, temp or scratch directories), usernames, hostnames, SSH host aliases or other local config
- secrets, tokens or credentials, or anything copied from a private source
- agent or session names (e.g. local tooling session ids); refer to roles instead: the lead, the implementer, the outside reviewer, the blind reviewer, DevOps

Public prior art (other open-source extensions, VS Code itself) is fine to name.

Before every commit, push or GitHub post, check the text for these. If something slips through, say so straight away instead of quietly fixing it, because removing it from public history takes a history rewrite.

## Documentation search

Always look things up in the docs through qmd, wherever you work in this repo. This applies to subagents too: tell them in the task.

- Search Toucan's own `toucan` index through the `qmd` MCP server: `toucan-docs` for `docs/`, `toucan-guides` for README.md and GROUNDING.md.
- Before changing code, search `toucan-docs` for the area; narrow to `adr/` for the binding system rules and direction, and to `plans/` for why things are the way they are.
- Use `query` with a `lex` line for exact terms and a `vec` line for the question, then `get` the hits you need instead of reading whole folders.
- If qmd isn't available, say so once, with the install line (`npm i -g @tobilu/qmd`, then `pnpm docs:index`; see README, Development), and read the files instead.

Hooks register Toucan's collections at session start and keep the keyword index fresh after doc edits. Run `pnpm docs:index` after bigger doc changes, to refresh the embeddings.

## Code rules

- `tryCatch` and `tryCatchSync` (`src/shared/async/tryCatch.util.ts`) are the standard wherever an error is caught, in `src/` and `scripts/` alike: `const [data, error] = await tryCatch(() => work())` (it takes the work, not a promise), then handle `error !== null`, and show the error with `errorText(error)`. A catch that cleans up and rethrows becomes tryCatch, the cleanup, then `throw error`. Keep `try/finally` only for cleanup that must run (a lock or a flag reset), and `.catch()` only on a promise chain nobody awaits, with a comment saying so.
- Await every promise. No `void` fire-and-forget (lint enforces it). Two exceptions: a non-modal notification goes through `notify()` (`src/core/notify.adapter.ts`), which doesn't wait for dismissal; and a sync event handler or timer with no caller to await hands its work off with a lint disable that states the reason.
- A function with two or more parameters takes one object argument, `fn({ a, b })`, typed by a named type: a `<Function>Args` interface (`<Class>Args` for a constructor) declared next to it, or an existing domain type (e.g. `EditInput`, `ActiveRepo`). Positional parameters stay only for callbacks whose shape someone else fixes (array methods, VS Code events, timers), type guards, and single-value functions and port methods. The one documented exception is the geometry helpers in `glyphDesign.consts.ts`, whose positional calls are the design table's notation (the file says why); it isn't a pattern to copy, and any new exception needs the same agreement and a comment.
- Every `oxlint-disable` comment states its reason after `--`. Fix the finding where you can, and disable a rule only where a fix would make the code worse.

## Tests must be able to fail

Every test has to survive one question:

> **Would this test still pass if the production code it covers were subtly broken?**

If yes, it proves nothing. It inflates coverage, costs maintenance on every refactor, and stays green on the day the code starts doing the wrong thing. Delete it or fix it.

Rules:

- **Never build the expected value by re-running the code under test.** A test that computes its expectation the way production does (e.g. calling `deriveColors`, `toHex` or `mergeCustomizations` to produce the expected value for that same function) passes by construction. Write expected values out literally: `"#e0620b"`, not `toHex(parse(...))`.
- **Assert the real outcome, not its wrapper.** "Is defined", "is an object", "has length > 0" or "didn't throw" doesn't tell right from wrong. Assert the exact value, key, count or order.
- **Every test needs a real assertion.** If the behaviour is "doesn't throw", call it directly (an exception fails the test anyway) and assert the observable result that proves the path ran.
- **The name must match the assertion,** not just the action. A name that promises one thing while the assertion checks another is worse than no test.
- **Never snapshot third-party behaviour.** Asserting what culori, jsonc-parser or VS Code returns tests their release, not our code. Assert the contract we depend on.
- **Fakes must be able to disagree.** With injected ports (the focus coordinator, settings writer, sidebar controller), a fake that returns whatever the code just wrote can't catch a bug. Seed fakes with state that differs from the desired result, and assert on what the code wrote.
- **Restating the implementation isn't a test.** Asserting that a method called its one dependency exactly once just repeats the method body.
- **Don't duplicate a test across files.** Copies drift, and a copy aimed at the wrong unit reports coverage the real one never got.
- **Prove it can fail.** When adding or changing a test, break the line it protects (flip a comparison, drop a branch, return early) and check that the test goes red. Then restore it. If it stays green, the test is wrong.

Mutation testing (StrykerJS with the vitest runner) measures this mechanically. It's not set up yet; if added, read the survived mutants, not the percentage.

Review checklist for any change that touches tests: *would this test still pass if the production code were subtly broken?*
