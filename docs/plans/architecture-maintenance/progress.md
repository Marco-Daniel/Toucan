# Progress: Architecture maintenance

<!-- Living log. Implementers append newest entries at the top. The planner
     leaves this body empty. Each entry: date, who/what, what changed, what's
     next or blocked. -->

## 2026-10-02 — The implementer, ADR check and CLAUDE.md (PR #7, `rules-and-adrs`)
- Did: a test keeps the ADR log whole: numbered without gaps, each with a title, kind and status, all listed in the index as their files say, and every cited `ADR-NNNN` existing and not superseded (`1a4ee14`).
- Did: CLAUDE.md rewritten as lean rules plus pointers, the ADR log first (`a7090b6`).
- Next: the post-merge checks (hooks firing, the MCP server, `enabledMcpjsonServers`), then re-indexing qmd on the main checkout.

## 2026-10-02 — The implementer, mutation testing (PR #9, `dry-upkeep`)
- Did: `pnpm mutate [files…]` runs StrykerJS on demand with the command runner (Stryker's Vitest runner doesn't work with Vitest 5), and the unused vitest runner is gone (`7c9574a`, `ec0d37c`, `6910c0e`). `scripts/qmd/` stays out of mutation however files are named, and `pnpm mutate` refuses glob patterns and files no test covers (`4646707`, `85c25c2`, `7f2b46b`).
- Did: test isolation for it: every test worker and every test run gets its own temp HOME and qmd cache, the qmd lock tests stay out of the real `~/.cache/qmd`, and detached hook workers a test leaves running are stopped (`f4bf489`, `3be12a3`, `951957b`, `a625425`).
- Did: tests for what the first mutation runs found: the warning texts, `fromHex`'s throw, and the atomic write's temp file mode (`aa77a2d`, `6d01406`).

## 2026-10-02 — The implementer, upkeep (PR #9)
- Did: an unused export dropped and two internals kept private (`aa17910`). The glyph geometry helpers are documented as the one positional exception to object arguments (`7b7f33a`). toucan-v1/0005 and glyph-set/0001 note that `FALLBACK_ICON` is gone, and the no-load-failure-signal fact stays next to the font icon (`e83e7d6`, `3511425`).

## 2026-10-02 — The implementer, shared helpers (PR #9)
- Did, in src and scripts: one `isOneOf` guard, one `roundToHundredths`, one atomic file write for the settings and the owner file, one "does this workspace set its own value" check, `writeUserSetting`, one one-shot timer for the debounces, `logFailure` for background failures, and one place that spawns the qmd hooks' detached worker (`cb12547` to `a0f7058`).
- Did, in tests: the real `asHex` instead of local casts, and shared helpers in `test/helpers/` for the Command Center color fixtures, the qmd script tests' scaffolding (with the fake qmd) and the comment-stripping settings parser (`f1af066` to `dd63907`).

## 2026-10-02 — The implementer, object arguments (PR #9)
- Did: every function with two or more parameters takes one object with a named `<Function>Args` type, from the shared helpers and `notify()` through every feature, the qmd and glyph scripts and the test helpers (`56b7021` to `3bfd3b7`, `9be1b52`, `ac9d539`). The rule went into the agent instructions, every object argument's type is named with the docs kept on the function, and an existing domain type may serve as the argument's type (`97d7934`, `4d999e8`, `f27cf5e`).

## 2026-10-02 — The implementer, tryCatch everywhere (PR #9)
- Did: a tryCatch Result narrows on its error, and tryCatch takes the work, not a promise (`90152c3`, `0669abe`). Every caught error goes through it: the entry point, log, settings, commands, focus, search emoji, the sidebar's background work (handed over as thunks) and the qmd scripts (`fc17823`, `f7f9395`, `77d1a8e`, `50f8365`). It became the rule (`4bc2eba`).
- Did: tests for the failures this exposed: the settings writer's write and revert failures, the focus queue logging a failed task, a second failure streak, unresolved dirty paths, the sidebar starting its work at once, and `exclusive` giving up on a held lock at once by default (`a986e4f`, `bf306df`, `3645384`, `0590765`, `c6de424`).
- Did: the qmd tooling moved into `scripts/qmd/` (`b7cfdf3`).

## 2026-10-02 — The implementer, source layout (PR #8, `file-moves`)
- Did: the sources moved into `src/core/`, `src/shared/<topic>/` and `src/features/<name>/` with role suffixes, the model split into its types, constants and hex helpers, and comments and docs point at the new paths (`4a005bb`, `cb63839`, `3f372f4`). Each command has its own file (`7a83b08`). Imports come from the defining files, and a layout test fails on any form of re-export (`6cce2c9`, `6a978f2`). `rules-and-adrs` is merged in, never rebased.

## 2026-10-02 — The lead and the implementer, plan and ADR log (PR #7, `rules-and-adrs`)
- Did: this plan, with decisions 0001–0028 (`da30956`). The ADR log in `docs/adr/`: ADR-0006 to 0013 as new decisions, and ADR-0001 to 0005 lifted from toucan-v1, whose decisions point to them with a "Lifted to" line (`4333041`, `ab255b2`). Each ADR links the plan decision behind it (`a194962`), and ADR-0006 and 0013 spell out why vscode stays a convention and what release notes contain (`5df9fe1`).
- Did: `docs/adr/README.md` gives a short overview of the system and indexes every ADR by area, with its kind and status. Code comments cite `ADR-NNNN` where a decision was lifted, `glyph-set/NNNN` in the glyph geometry, and `toucan-v1/NNNN` for the rest; before, a bare "(0017)" could mean either plan.
- Next: the ADR check test, and the CLAUDE.md rewrite.

## 2026-10-02 — The implementer, tooling config and lint fixes (PR #7)
- Did: stricter TypeScript (`noImplicitReturns`, `noUnusedLocals`, `noUnusedParameters`, `noPropertyAccessFromIndexSignature`) and type-aware oxlint with every finding an error (`a3828da`, `4fcefac`). The lint config was trimmed to the rules that matter, with `no-void` and `no-unnecessary-type-assertion` on (`9a6d57e`).
- Did: the findings fixed: `tryCatch` added as a Result-tuple wrapper, the promises started by focus and sidebar events handled, jsonc-parser token kinds compared as plain numbers, unsafe type assertions replaced with checks, the magic numbers named in src and scripts, notifications sent through `notify()` with `void` forbidden, and types imported in their own `import type` statements (`fe4210e` to `5587ffd`, `ff4edf2`, `bc6ff73`). A test checks that every sidebar hand-off logs its failure (`eb2dafe`).
- Did: a husky pre-push hook runs typecheck, lint, format:check and test, skipped in CI (`f3e8855`). The promise and lint-disable rules went into the agent instructions (`b48c2f6`).

## 2026-10-02 — The implementer, qmd docs search (PR #7)
- Did: qmd docs search with its own `toucan` index: `pnpm docs:index`, a PostToolUse re-index hook and a SessionStart bootstrap hook, and `.mcp.json` with the MCP server pre-approved (`b91c8f6`, `209825b`, `2fafec6`, `38200ef`). It's part of the setup for working on Toucan, with step-by-step install notes (`3f65160`, `d68875b`, `edac783`, `ae0a5ee`).
- Did: one qmd job at a time behind a lock in qmd's own cache folder, which `docs:index` takes too, judged stale by its owner and taken over safely, with a heartbeat for long runs, and a re-run loop that stops at a stuck pending note (`f331d6d`, `aca0bf3`, `9fda7ab`, `0bd3a21`, `b1f845d`).
- Verified: the hook and `docs:index` tests run against a fake qmd, with their own HOME and cache, wait for the worker rather than a timer, and bound every child process (`1ee6c32`, `95a840a`, `8190476`).
