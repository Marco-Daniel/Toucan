# Thinking trail: Architecture maintenance

## Starting framing

After the glyph set, Marco wanted "folder architecture, ADRs, things like that, code and architecture maintenance" as the next PR. He asked to move in steps: a top-level brainstorm on topics first, then each topic in a brainstorm or grill, then back up. He wanted the repo DRY "not obsessively, but more than an AI agent tends to do on its own". He wanted a proper CLAUDE.md of coding standards, with ADRs playing a "major role", and a clear file and import organisation. The assumption was a single PR.

## Turns

**ADRs moved to the front, then changed meaning.** ADRs were first proposed as topic 1 for a practical reason: plan-decision numbers in code comments had started to clash across plan folders. Marco raised their weight ("proper ADRs are most important in AI programming"), then reframed them: read together, they describe the whole system and the direction it's heading. That added direction ADRs, the overview, and the check. → 0001, 0002, 0003, 0004

**Review behaviour comes from CLAUDE.md, not a separate rule.** A two-layer setup (agent plus reviewers) was proposed. Marco pointed out that if CLAUDE.md names the ADRs as the most important documentation, reviewers follow from it. → 0004

**qmd went from "be prepared" to required, and then to its own index.** qmd started as an option to switch on later. Marco wanted it set up at once and made a must. The first build used qmd's default index. A review then reproduced a bare `qmd update` emptying another project's collection, so Toucan moved to its own named index. Later reviews found a symlink-clobber path in the lock, an over-built lock (simplified to a plain exclusive lock in qmd's own cache folder), a loop that could spin forever, and missing CI timeouts. → 0005

**CLAUDE.md became lean plus a library.** The instruction-file research argued for minimal files, and showed what bloat costs. Marco combined "enforce first" with "minimal" and added the idea of a library: pointers that say where to look, not the knowledge itself. → 0006

**The no-warnings rule raised the question of how to introduce a rule.** Making every rule error or off removed warnings as a staging tool, so the question became what happens when a new rule breaks existing code: case by case, fixing preferred, ignores with reasons. → 0009, 0012

**Type-checking briefly moved to oxlint, then back to tsc.** Marco first chose `oxlint --type-check`, then reverted to tsc because that flag is experimental. Type-aware *lint* stayed. → 0010

**`void` fell, and tryCatch spread.** The fire-and-forget question became "await everything through tryCatch". Marco dislikes `void`. A review then found notifications that can't be awaited, which led to `notify()` and the `no-void` rule. tryCatch then became the standard for every caught error, scripts included, and took a function so that a synchronous throw is caught too. → 0013

**The folder framing was rejected, then rebuilt.** Grouping by feature or by layer, as first framed, was rejected. Marco brought in core/shared/features with role suffixes, and "core" changed meaning from "pure" to "wiring". The VS Code boundary moved from a folder into the file name. A later correction put every shared file in a topic folder. → 0016, 0017

**The adapter boundary stayed a convention twice.** Marco chose not to lint "no vscode in core". After the suffix rule made a lint rule cheap, it was asked again, and he kept it a convention. → 0017

**Reuse "from the start" needed a counter-rule, and found one in object arguments.** "Shared from the start" risked over-abstraction. Marco's answer, object arguments by default, gives growth room without designing options up front. The counter-rule then listed what not to build. All existing functions were converted. The glyph geometry helpers became the one documented exception. → 0022, 0023

**Stryker was set up, then fenced off from the qmd scripts.** Stryker on demand turned out to need the command runner (Vitest 5). Mutating the qmd scripts then:
- wrote a lock into the real qmd cache
- left orphaned looping workers
- reported dozens of false survivors, because mutants never reached the child processes

Marco excluded `scripts/qmd/` instead of building more isolation. → 0025

## Rejected without a decision file

- **Lint-enforcing ignore reasons through a jsPlugin now.** The plugin support is alpha; this became a direction instead.
- **Moving scripts into src/.** `src/` is what ships.
- **Merging the find-form `oneOf` into a derived helper.** Unneeded once `isOneOf` covered both sites.
- **Keeping `@stryker-mutator/vitest-runner` for later.** A speculative dependency under the counter-rule.
- **An automated dead-reference docs test.** Marco chose the rule plus a periodic skill (issue #6).

## Open / to re-check

- The hooks firing, the MCP server starting and `enabledMcpjsonServers` suppressing the prompt in a live session can only be verified after #7 merges (the post-merge checklist).
- Re-index the `toucan` qmd index from main after #7–#9 merge (→ 0028).
- When oxlint's `jsPlugins` support stabilises, enforce ignore reasons through lint.
