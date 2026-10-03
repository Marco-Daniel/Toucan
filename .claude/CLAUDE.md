# Toucan

**Ground:** repo facts and the quality commands are in [GROUNDING.md](../GROUNDING.md).

## Architecture decisions: read these first

The ADRs in [docs/adr/](../docs/adr/README.md) are the most important docs: the system's rules and direction. Its README gives the overview and the index by area.

- **constraint**: a rule code must follow. Changing it needs a new ADR that supersedes it.
- **background**: context that explains the system.
- **direction**: where the code is heading. `Migration: as touched` means move code you change; `tracked` means planned work.
- Cite an ADR as `ADR-NNNN` in code and docs; a test fails on one that doesn't exist, or (in code and the guides) isn't Accepted.
- Before changing an area, search its ADRs (qmd, `toucan-docs` `adr/`).
- `docs/plans/<plan>/` holds one piece of work's intent and history, not rules.

## Documentation search

Always look things up in the docs through qmd (ADR-0011), wherever you work in this repo. This applies to subagents too: tell them in the task.

- Search the `toucan` index through the `qmd` MCP server: `toucan-docs` for `docs/` (narrow to `adr/` for rules, `plans/` for why), `toucan-guides` for the READMEs and GROUNDING.md.
- Use `query` with a `lex` line for exact terms and a `vec` line for the question, then `get` the hits you need instead of reading whole folders.
- Hooks keep the keyword index fresh; run `pnpm docs:index` after bigger doc changes, to refresh the embeddings.
- If qmd isn't available, say so once with the install line (`npm i -g @tobilu/qmd`, then `pnpm docs:index`; see README, Development) and read the files instead.

## Code rules

- **Layout** (ADR-0010): the extension lives in `apps/extension/`, with `src/core/`, `src/shared/<topic>/`, `src/features/<feature>/` under it, role suffixes (`.adapter`, `.util`, `.consts`, `.types`, `.view`, `.messages`), no barrels or re-exports. Only adapters and `apps/extension/src/core/extension.ts` import `vscode` (ADR-0006). A package's `test/` mirrors its `src/`; shared test helpers go in its `test/helpers/<topic>.ts`. The repo's own tooling (qmd docs search, docs-sync) lives in the root `scripts/` and `test/`.
- **Names:** functions are verbs, booleans read as `is`/`has` questions, constants `UPPER_SNAKE`, types PascalCase, files camelCase with their role suffix.
- **Imports:** grouped under comment headers in this order, only the ones needed: `// import vscode`, `// import libraries` (including `node:*`), `// import adapters`, `// import utils`, `// import views`, `// import consts`, `// import messages`, `// import types`. Generated tables go under `// import consts`; test helpers and suffix-less scripts under `// import utils`. Types come in through their own `import type`; importing a path twice is fine.
- **Shared from the start:** code another feature could use unchanged goes to `shared/<topic>/` at once, even with one caller; feature code stays in its feature. No speculative options, generics nobody needs, single-call wrappers, feature rules dressed as generic code, or merged look-alikes that change for different reasons.
- **Object arguments:** two or more parameters take one object, `fn({ a, b })`, typed by a named `<Function>Args` interface (`<Class>Args` for a constructor) next to it, or an existing domain type. Positional stays for callbacks whose shape someone else fixes, type guards, and single-value functions and port methods. The geometry helpers in `glyphDesign.consts.ts` are the one documented exception; new ones need the same agreement and a comment.
- **Errors** (ADR-0009), in source and scripts alike: catch with `tryCatch(() => work())` or `tryCatchSync` (`apps/extension/src/shared/async/tryCatch.util.ts`), handle `error !== null`, show it with `errorText(error)`; cleanup then rethrow is tryCatch, cleanup, `throw error`. `try/finally` only for cleanup that must run; `.catch()` only on a chain nobody awaits, with a comment.
- **Promises:** await every one; no `void`. A non-modal notification goes through `notify()` (`apps/extension/src/core/notify.adapter.ts`). A sync event handler or timer with no caller to await hands its work off with a lint disable stating why.
- **Lint** (ADR-0007, ADR-0008): every finding is an error. Fix it; disable a rule only where a fix makes the code worse, and state the reason after `--` in the `oxlint-disable` comment.
- **Exports:** remove one nothing uses; one only tests use may stay.

## Tests must be able to fail

Every test has to survive one question: **would it still pass if the code it covers were subtly broken?** If yes, delete or fix it.

- Write expected values out literally; never compute them with the code under test.
- Assert the exact value, key, count or order, not "is defined", "has length > 0" or "didn't throw".
- Every test needs a real assertion: if the behaviour is "doesn't throw", call it directly and assert the observable result that proves the path ran.
- The name says what the assertion checks.
- Don't snapshot third-party behaviour (culori, jsonc-parser, VS Code); assert the contract we depend on.
- Fakes must be able to disagree: seed them with state that differs from the desired result, and assert what the code wrote.
- Don't restate the implementation (that a method called its one dependency once), and don't duplicate a test across files.
- Prove it can fail: break the line it protects, see it go red, restore.
- Mutation testing, on demand (not in CI or the pre-push hook): `pnpm mutate <files you changed>` at the root for its tooling, `pnpm -C <package> mutate <files>` for a package (`apps/extension`, `packages/brand`), with paths relative to that package. Read every survived mutant; kill it with a test or say why it's equivalent. Never chase the percentage. `scripts/qmd/` is never mutated (ADR-0012); delete the package's `reports/stryker` after changing what's excluded.

## Keep docs in sync

A change to a command, a path or a behaviour updates every doc that mentions it, in the same PR. Run `/docs-sync` every so often to catch what slipped through.

## This repo is public

Everything pushed to GitHub is public: files, commit messages, branch names, PR and issue text, review comments and CI logs. None of that may contain:

- references to other projects or repositories of the owner, or where an idea was borrowed from (describe the idea itself)
- local machine details: absolute paths (home folders, temp or scratch directories), usernames, hostnames, SSH host aliases or other local config
- secrets, tokens or credentials, or anything copied from a private source
- agent or session names; refer to roles instead: the lead, the implementer, the outside reviewer, the blind reviewer, DevOps

Public prior art (other open-source extensions, VS Code itself) is fine to name. Check every commit, push and GitHub post for these. If something slips through, say so straight away instead of quietly fixing it: removing it from public history takes a history rewrite.
