# Toucan

**Ground:** Repo facts are in [GROUNDING.md](../GROUNDING.md)

## This repo is public

Everything pushed to GitHub is public: files, commit messages, branch names, PR and issue text, review comments and CI logs. None of that may contain:

- references to other projects or repositories of the owner, or where an idea was borrowed from (describe the idea itself)
- local machine details: absolute paths (home folders, temp or scratch directories), usernames, hostnames, SSH host aliases or other local config
- secrets, tokens or credentials, or anything copied from a private source

Public prior art (other open-source extensions, VS Code itself) is fine to name.

Before every commit, push or GitHub post, check the text for these. If something slips through, say so straight away instead of quietly fixing it, because removing it from public history takes a history rewrite.

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
