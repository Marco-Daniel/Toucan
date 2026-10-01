# Progress: Toucan v1

<!-- Living log. Implementers append newest entries at the top. The planner
     leaves this body empty. Each entry: date, who/what, what changed, what's
     next or blocked. -->

<!-- Example entry (delete this comment block once real entries exist):

## YYYY-MM-DD — <agent/session>
- Did: <what was implemented/committed> (<sha>)
- Verified: <how>
- Next: <what remains> / Blocked: <on what>

-->

## 2026-10-02 — toucan-ab (implementer), loop round 4
- Context: blind review of 0af5358 (1 High, 1 Low); judged independently, both accepted. R4-1 was reproduced live before the fix: a folder named `[x](command:workbench.action.showCommands)` rendered a clickable command link in the Set Glyph and Clear Color toasts, trusted and in Restricted Mode; the Clear Color modal stayed plain text.
- R4-1: the Set Glyph and Clear Color toasts and the Clear Color modal no longer include the folder name (`src/core/messages.ts`, "This folder …"). A guard test scans every `show*Message` call in src for an interpolated folder name. Mutation-red: putting the name back at any of the three sites, or into another message.
- R4-2: the `update()` fallback recomputes the value from the view right before writing, and skips the write when the updater leaves the setting alone. `tryInPlace` now returns only the reason. Tests: a hand edit saved during the verify wait is kept, and a recomputed "leave alone" writes nothing. Mutation-red: writing the pre-attempt value, and falling back to it.

## 2026-10-02 — toucan-ab (implementer), loop round 3
- Context: blind review of 33b4d0c, 2 Low; judged independently, both accepted.
- R3-1: the applied flag is recorded on the "already applied" path only when colorCustomizations is an object; a non-object value is never written over, so nothing was applied. Test: a string setting with colors defined, no write and no markApplied. Mutation-red.
- R3-2: the default-profile test ends with a profile write on the same path, which must still be verified and reverted, not given up on. Removing the profile-only guard in `recordMiss` is now mutation-red.

## 2026-10-02 — toucan-ab (implementer), loop round 2
- Context: blind review of 5b9dd0c, 2 Medium + 2 Low, with agreed refinements in the threads; judged independently, all four accepted.
- R2-1: Toucan records the applied flag also when its colors are already in settings (reinstall, Settings Sync, a crash before the flag was written), and after a successful write, each in its own try with its own warning. The reproduced scenario is the test. Mutation-red: either call site, the catch, the hasApplied short-circuit.
- R2-2: a guessed (profile) settings file counts as unfollowed only after two consecutive misses; a miss isn't counted when the file changed meanwhile, the default profile's file never counts, and a followed edit resets the count. Mutation-red: each of the four conditions, plus a threshold of 1 or 3.
- R2-3: the contrast lookup reads `COLOR_CUSTOMIZATIONS` instead of a literal, keeping `get()` for the effective (merged) value.
- R2-4: a test removes the first of two properties on one line (the line-break guard is mutation-red; the value is asserted, not jsonc-parser's layout). Edits now run in the desired value's order, so new keys land in that order (pinned), and the inaccurate "from the end first" comment is replaced.
- toucan-2c L1 on a4731ec: `unfollowed` is checked only for the `profile` target. When both targets resolve to the same file (own settings, shared global state), two missed color writes no longer stop `toucan.repos` from being edited in place. Test: both targets on one path, two profile misses, then a defaultProfile write edited in place. Mutation-red with the target check removed.

## 2026-10-02 — toucan-ab (implementer), loop round 1: isolated VS Code pass
- Run 1 (f830912, VS Code 1.139.1): all checks passed. Status label "Toucan: webshop, Beak Orange check circle"; focus apply/clear in about 200 ms; the contrast warning in Set Color (warning severity) and Pick Preset (Plumage Black marked, Beak Red not); Toggle registered from commands.ts; search emoji consent/apply/restore; the Agents offer naming `chat.agentsControl.enabled`. Finding (a), comments inside a repo entry lost on Set Color, is fixed in a996c47.
- Run 2 (fcde45e, `--log marco-daniel.toucan:debug`):
  - A comment trailing the line before Toucan's keys and a comment line above them survive two apply/clear cycles, byte for byte, back to the original block.
  - Finding (b), the consent modal and the restore also running in an unfocused window: **a harness artifact, not a bug**. With CDP keyboard input sent into both windows, the second window's log showed "focused" and never "blurred", although it lost focus several times; CDP input leaves a renderer believing it's focused. In a clean relaunch with focus switched through the CLI only, the logs were correct (webshop "focused", toucan "blurred"), only the focused window showed the modal, and only it logged "Restored window.title." 0015's focused-window-only rule holds. For later harness runs: don't send CDP input to more than one window.
- Cosmetic, left as is: while colors are applied, the user's trailing comment from the last property sits on Toucan's last key (where jsonc-parser's insert puts it). It returns to its line on clear.

## 2026-10-02 — toucan-ab (implementer), loop round 1: comments inside repo entries (0017)
- Found by the isolated VS Code pass: Set Color replaced the whole `toucan.repos` entry, so a comment inside an object entry was lost. Manager: fix now; toucan-2c: recurse generally.
- Did: `planEdit` edits every changed path as deep as both sides stay objects (`changedPaths`), so Set Color changes only `background` inside the entry. Removals use the whole-line removal at any depth, and the comment check exempts only the changed values themselves. `changed` stays the top-level keys: `viewReflects` compares each whole entry by deep equality, so a nested edit is still recognized as reflected.
- Tests: one field changed and one removed inside a commented entry (exact text); a three-level edit; a partly changed one-line entry with an inline comment falls back; and a writer test where a nested in-place edit is verified by the following view with no `update()`.
- Verified: all quality commands and check:vsix pass. Mutations proven red: no descent, one level only, jsonc removal instead of the own removal, top-level exemption in the comment check, `===` in viewReflects.

## 2026-10-02 — toucan-ab (implementer), loop round 1: self-found comment loss (0017)
- Found while checking tests against the project's test rules: jsonc-parser removes a property from the end of the previous value, so a trailing comment on the line before Toucan's keys, or a comment line above them, was deleted with them. Manager: fix within 0017 now.
- Did:
  - `removeLines` deletes a removed property's own lines. A trailing comment on a removed line moves to the end of the line before, or onto its own line when that line already ends in a `//` comment. A property that shares its line falls through to jsonc-parser.
  - `keepsComments` post-check: every comment outside the changed values must survive, or the edit falls back.
  - The full-text tests now pin Toucan's removal and the apply-then-clear round trip (CRLF), not jsonc-parser's comment placement after an insert.
  - jsonc-parser's `getTokenValue()` includes whitespace before a comment, so comments are read by offset and length.
  - bd70994 (earlier): the muted style's doc comment and enumDescription match L24.
- Verified: all quality commands and check:vsix pass. 11 mutations proven red (own removal, the comment check and its exemption, the own-line branch, the moved comment, CRLF, trailing-space trim, the line-start guard, the line end).

## 2026-10-02 — toucan-ab (implementer), loop round 1: M1 temp file mode
- Did: the rest of M1. The temp copy of settings.json is created with the original's mode (`writeFile(…, { mode })`), so it's never more readable than the original, even before the chmod.
- Verified: all quality commands pass. Not mutation-testable: the final mode is the same either way, and the temp file only exists inside the call.

## 2026-10-02 — toucan-ab (implementer), loop round 1 (F): docs and notices
- Did:
  - L28: `THIRD_PARTY_NOTICES.md` with the culori and jsonc-parser MIT licenses and the Codicons CC BY 4.0 attribution. It ships in the VSIX (.vscodeignore) and is in check:vsix's expected list. The icon waits for the Marketplace.
  - L25: a Commands section in the README, and `dist/extension.cjs` in the development table.
  - L26: the README says Toucan asks "until you answer", and the offer names `chat.agentsControl.enabled`.
  - L4: a Settings Sync note recommending `settingsSync.ignoredSettings`.
  - L18: a note on removing `commandCenter.*` by hand after a crash followed by an uninstall.
  - Amended 0008: the README says hand-set colors stay until Toucan first applies a color in that profile.
  - L16: a comment in `writeLikeVsCode` accepting the truncating write of a linked file as VS Code parity. L20: a comment on why the stable document API isn't used (`save()` would save the user's unsaved edits).
- Verified: all quality commands and check:vsix pass (7 files).
- Next: the isolated VS Code pass, then replies on all 38 round-1 threads.

## 2026-10-02 — toucan-ab (implementer), loop round 1 (E): literal test expectations
- Did:
  - L29: config tests assert the issue messages literally.
  - L31: the post-edit guard is driven by a duplicate key (the edit changes the first, the parser keeps the last), not by a jsonc-parser quirk.
  - L32: planEdit tests compare full texts. The `eol` formatting option was dead (jsonc-parser takes line endings from the file), so it's removed, and a new CRLF object-insert test pins the behavior.
  - L33: three derived sets (dark, light, saturated) written out in full; lightness is measured with culori's `parseHex`, not production code.
  - L34: full nine-color rows for squares, circles and hearts.
  - L35: the own-entry test uses an inherited `webshop` entry, so it can fail.
  - L36: presets moved to `presets.test.ts` as literal (name, hex) pairs.
  - L39: dead `World` setup removed; the gamut-mapping test asserts "not clamped, hue kept" instead of culori's exact output.
- Verified: all quality commands pass. Mutations proven red: `Object.hasOwn`, swapped circle and heart emoji, a preset hex, a config message, the hover shift and the inactive alpha.

## 2026-10-02 — toucan-ab (implementer), loop round 1 (D): wiring and small cleanups
- Did:
  - L12 (and toucan-2c's L1 on 74840b9): fire-and-forget work in extension.ts goes through `background(what, task)`, which logs a failure instead of leaving an unhandled rejection. The search emoji's reassert timer catches too.
  - L21: one guarded logger, `createLog()` in `src/log.ts`, used by every adapter. The copies in focus.ts and settingsWriter.ts are gone.
  - L22: all five commands are registered in commands.ts. Toggle stays a `SidebarBlock` method; its boolean `update()` is kept on purpose, since a boolean has no comments inside it and the writer handles Toucan's object settings. extension.ts has the one `onDidChangeWindowState` listener, which fans out to the coordinator, the sidebar, the Agents offer and the search emoji.
  - L23: a `parseSettings` helper, `SidebarStyle` instead of the re-spelled union, and `NEUTRAL_GRAY` (built through `toHex`) instead of `"#808080" as Hex`. `SIDEBAR_CONTAINER_ID` stays: the manifest test uses it to keep package.json in sync.
  - toucan-2c's L2 on 74840b9: the workspace window.title note is logged once per change, not on every focus.
- Verified: all quality commands and check:vsix pass. Mutations proven red: the parse error check and the object check (with a new non-object test). Making `!result` optional is equivalent: an unparsable edit gives `undefined`, which never equals the expected value.

## 2026-10-02 — toucan-ab (implementer), loop round 1 (C3): a clock for the writer's verify step
- Did: L37. `SettingsFileWriter` takes an optional `clock` (`now`, `sleep`) for the verify step, real by default. The tests use a fake clock whose `sleep` is where VS Code's view catches up, replacing the 5 ms `setInterval` watcher. The "someone else wrote" step runs from that callback instead of a wall-clock wait. No writer test waits on real time any more: the file runs in about 0.2 s, and the full 4 s / 100 ms timing is asserted (40 polls).
- Verified: all quality commands pass; the suite was green 5 times in a row. Mutations proven red: the deadline, `<=` at the deadline, the changed-since check.
- Next: group D (logging, Toggle registration, settings helpers).

## 2026-10-02 — toucan-ab (implementer), loop round 1 (C2): search emoji sequencing into core
- Did:
  - M9: the window.title heal/consent/apply/restore sequence moved from `src/searchEmoji.ts` to `TitleSetup` in `src/core/titleSetup.ts`, behind ports. The adapter keeps labelling and git hooks. Tests pin the order (pending record, title, settled record), decline turning the feature off, a failed write clearing the record and warning, no dialog when the variable is already there, a single dialog at a time, restore and keep-edited, and crash recovery only in the focused window.
  - L15: the title is read again after the dialog, so a change made while it was open isn't overwritten and the record isn't stale.
  - L14: when the workspace or folder sets its own `window.title`, the consent dialog says the emoji won't show in this window, and labelling logs it.
- Verified: all quality commands pass. 14 mutations proven red, including writing the title before the pending record.
- Open: an isolated VS Code pass over the search emoji consent, the contrast warnings and the status bar label at the end of round 1.

## 2026-10-02 — toucan-ab (implementer), loop round 1: toucan-2c on A/B
- Did:
  - [M1] A window with nothing to apply that hasn't seen a first applied color no longer takes ownership. Before, it wrote the owner file and then skipped the clear, so the previous owner's blur skipped its clear too and the colors stayed. Test: exactly that scenario, with a per-window lagging `hasApplied`. Another new test pins the guard in `write()`: an owner whose first apply failed doesn't clear hand-set colors on blur.
  - [L1] `activeThemeName` picks `workbench.preferredDarkColorTheme` / `preferredLightColorTheme` when `window.autoDetectColorScheme` is on (not in high contrast). 0018 now names the theme-block lookup and auto-detect.
  - [L2] The 3:1 line is pinned with the closest hex below it (#7747cb, 2.999999) and a gray just above (#646464, 3.0006) on #181818. `<` vs `<=` is equivalent for hex colors: a search found no pair at exactly 3:1 on #181818, #f8f8f8, black or white, nor among all gray pairs.
- Verified: all quality commands pass. Mutations proven red: both first-use guards, auto-detect, dark/light swap, the string check, the high contrast clause, thresholds 2.99999 and 3.001.

## 2026-10-02 — toucan-ab (implementer), loop round 1 (C1): sidebar guards and the owner file
- Did:
  - M7 / L38: sidebar tests for a settings change while disabled, before `start()`, while visible and during a running reveal, and for Toggle forgetting the remembered close without a visibility event.
  - M8: the owner file moved to `src/core/ownerFile.ts` and is tested in a temp dir: round trip, missing directory, garbage/null/non-string/missing `window`, 20 concurrent writers, and a failed rename leaving no temp file. The unread `at` field is gone; a failed write now removes its temp file.
  - The mid-verify writer test waits with `vi.waitFor` (no await-in-loop lint warnings).
- Verified: all quality commands pass. Mutations proven red: each of the three `settingsChanged` guards, the `revealing` guard, Toggle's `writeClosed(false)`, the owner key, mkdir, the string check, the per-window temp name, the temp cleanup.
- Next: toucan-2c's review of A/B (first-use guard taking ownership, auto-detected theme name, the 3:1 boundary), then M9/L14/L15 and L37.

## 2026-10-02 — toucan-ab (implementer), loop round 1 (B): status bar contrast and labels
- Did:
  - M5 / 0018: Set Color shows a warning (not an error) and Pick Preset marks presets that fall under 3:1 WCAG contrast against the status bar. The background is the user's `statusBar.background` override (a `"[Theme]"` block first, then top level), otherwise Dark Modern `#181818` or Light Modern `#f8f8f8` for the theme kind. High contrast themes never warn. Pure logic lives in `src/core/contrast.ts`.
  - L27: the status bar's screen reader label names the preset color and glyph ("Toucan: webshop, Beak Orange check circle") instead of reading out a hex code (`src/core/labels.ts`).
  - L24: the muted sidebar block draws the name in the theme's foreground; the repo color on its own tint was too faint for text.
- Verified: all quality commands pass (296 tests). Mutations proven red: override order, the high contrast skip, the threshold, the muted name color, glyph names in the label.
- Next: round 1 group C (sidebar guard tests, owner file and search emoji sequencing into core, injected clock in the writer).

## 2026-10-02 — toucan-ab (implementer), loop round 1 (A): writer and coordinator safety
- Context: overnight review loop on PR #1, round 1 (38 findings), judged independently. This commit:
  - M3 / amended 0008: the coordinator never clears `commandCenter.*` until Toucan has applied a color in this profile (`hasApplied`/`markApplied` ports, globalState), so hand-set colors survive installing Toucan.
  - M2: the stale snapshot wraps the file value, so a file that lost the whole setting still gets its one rewrite.
  - L11: a failed owner write is logged and the colors are applied anyway.
  - L19: the coordinator's queue is built on `createLock`.
  - M1: writer I/O failures (write, chmod, rename, revert) fall back to update(), and the temp file is removed.
  - L13: a file whose edit VS Code didn't follow goes straight to update() from then on.
  - L17: `__proto__` repo names become own keys.
- Tests (M6, L30 and the above): first-use guard both ways, a failing owner write, the setting gone from the file, stale → converge → same stale again, and a real change in between; writer: failing temp write (read-only dir), failing rename with temp cleanup (macOS-only: immutable flag), missing file, file gone during planning, recompute leaving the setting alone, per-target routing, unfollowed file.
- Proved by mutation (each red, then restored): every new guard and fallback, including the reviewer's four writer mutations and both staleSnapshot resets.
- Verified: 286 tests; all quality commands pass.

## 2026-10-01 — toucan-ab (implementer), Dependabot npm trial
- Did (Marco's decision, after the corrected facts): the npm block is enabled as a trial, with the groups, ignores and cooldown from the draft. A note above it says pnpm 12 works in practice but isn't documented yet, and dependabot-core#15904 (only the first document of a two-document lockfile is read, so security alerts may miss packages) is open. If its PRs fail or CI's frozen-lockfile install rejects them, switch the block off again and record why. The first npm PR's CI run is the proof; toucan-6c watches it.

## 2026-10-01 — toucan-ab (implementer), Dependabot
- Did (Marco chose option a): Dependabot covers github-actions only, every Monday at 09:00 Europe/Amsterdam, with a 7-day cooldown, at most 3 open PRs, labels `dependencies` + `github-actions`, commit prefix `deps` with scope, and all actions in one group.
- npm is a commented, ready-to-enable block. It's off because Dependabot's documented pnpm support stops at v10. Correction (toucan-6c, verified in its issue tracker): pnpm 11 and 12 support was added on 2026-09-15 and a pnpm 12.6+ failure fixed on 2026-09-29, but parsing pnpm 12's two-document lockfile (ours has two documents) is still an open issue. My first check had missed the recent closures; the file comment now states the accurate reason. The block holds groups that match in order (test, lint-format, build, vscode-tooling, font, runtime, everything-else), with majors as separate PRs; ignores for `@types/vscode` (bumped by hand with engines.vscode) and `@types/node` majors (Node 22 floor); and a 7-day cooldown (14 for majors). Enable it once pnpm 12 is supported and CI's frozen-lockfile install accepts Dependabot's lockfile. npm updates stay manual until then.
- CI needs no secrets (only `contents: read`), so Dependabot PRs can pass it.

## 2026-10-01 — toucan-ab (implementer), title-record self-heal without the race
- Found (toucan-2c M1 on 995600a): the self-heal from the previous round trusted each window's view of `window.title`, which can lag other windows' writes by seconds. A window focused right after another window accepted the dialog could drop the record while the title stayed changed, so turning the emoji off would never restore it (against 0015).
- Fix: the record carries `pendingSince` (a timestamp) from just before the title write until it succeeds. `unappliedChange` only drops a record that is still pending, older than 30 s (`PENDING_STALE_MS`), and whose title is still the previous one; only the focused window checks. A settled record is never dropped, and neither is a recent pending one, whose write may still be under way elsewhere (toucan-60's refinement). Records from before the field count as settled.
- Proved by mutation: ignoring the age, treating a missing `pendingSince` as old, and using `>=` instead of `>` at the 30 s boundary each fail a test.
- Verified: all 5 quality commands pass.

## 2026-10-01 — toucan-ab (implementer), PR #1 review: code tidy-ups
- Did (agreed Lows, judged valid):
  - #11 and #16: the config listener uses independent `if`s and the generated sidebar keys, so one event touching several settings refreshes each.
  - #13: the in-place clear-all keeps the empty object, which keeps comments inside it (0017). Tests pin the exact text: `{` and `}` on separate lines, with CRLF kept.
  - #15: `supportHtml` dropped from the tooltip, after checking in an isolated VS Code that the data-URI swatch still renders without it (a 32×32 image in the hover).
  - #17: `src/ids.ts` holds the status item, container, view and context-key ids, and a manifest test ties them to package.json.
  - #18: one `isRecord` in core/records.ts instead of six copies.
  - #19: `withRepo` replaces the four repo checks in commands; `userValue` replaces three `inspect().globalValue` reads; the focus adapter uses `writer.file("profile")` and `settingInText` instead of deriving and parsing again.
  - #20: `resolveSidebarSettings` in core narrows the raw settings and applies the repo override.
  - #21: shared `fromHex` and `toOklch` in core/color.ts. The emoji mapper no longer falls back to black on an unparseable Hex; it throws like the deriver, since a Hex always parses.
- Also, toucan-2c's two lows on e039fd3:
  - A failed `window.title` write is caught in refresh and shown as a warning instead of an unhandled rejection.
  - `unappliedChange` drops a recorded change whose title write never happened (the title is still `previous`), so the next step asks again.
- Proved by mutation (each red, then restored): resolveSidebarSettings ignoring the repo override or accepting a non-boolean `enabled`; unappliedChange ignoring the title; settingInText ignoring parse errors; a renamed view id.
- Verified: 270 tests; all 5 quality commands, check:bundle and check:vsix pass; lint 0 warnings.

## 2026-10-01 — toucan-ab (implementer), PR #1 review: CI and build
- Did:
  - Low #7: `pnpm check:vsix` (scripts/check-vsix.mts) fails unless `vsce ls --no-dependencies` lists exactly the six expected files. CI runs it. The manual Package VSIX workflow now runs the generated-files check, lint, format, typecheck and tests before packaging, then check:bundle and check:vsix.
  - Low #14: all actions are pinned to the commit of their current release in the major already used (checkout v5.1.0, setup-node v5.0.0, pnpm/action-setup v6.1.0, upload-artifact v5.0.0), with `persist-credentials: false` on checkout. Dependabot keeps the pins current; major bumps are left out of this change.
  - Low #23: the generated-files check also fails on new untracked files (`git status --porcelain`).
  - Low #24: `@types/node` ^22 to match the node22 build target. It typechecks, so no Node 24-only API was in use.
  - Low #10 dismissed: the re-read already happens right before the write. A stat check would only narrow the read-to-rename gap by microseconds, which 0017 accepts and VS Code's own update() has too, and verify-and-revert covers the outcome.
- Proved: letting `.vscodeignore` ship media/** makes check:vsix fail ("Extra: media/icons/bar.svg, …").
- Verified: all 5 quality commands, check:bundle and check:vsix pass.

## 2026-10-01 — toucan-ab (implementer), PR #1 review: policy into core
- Did:
  - Agreed Medium #3: the search emoji's consent/restore decision (`searchEmojiStep`), its label decision (`shouldLabel`), Clear Color's "typed by hand" check (`handEditedKeys`) and Set Color's input check (`validateColorInput`) moved into core with tests. The adapters only call them.
  - Agreed Low #9: the `{ previous, written }` record is stored before `window.title` is changed, and removed again if that write fails, so a crash in between can't leave a title Toucan doesn't know how to restore.
  - Agreed Low #12: Clear Color checks `Object.hasOwn`, so a folder named after an `Object` prototype key doesn't count as configured.
  - toucan-2c's technique for the recompute on re-plan: a fake view rewrites the file on its first planning call, and the test asserts the update() fallback carries the value computed from the latest view.
- Proved by mutation (each red, then restored):
  - Dropping searchEmojiStep's focus check, or its "nothing recorded" condition, fails a test; so does shouldLabel ignoring the change.
  - validateColorInput accepting translucent colors fails a test; handEditedKeys not filtering the background fails 2.
  - Reusing the old value instead of recomputing fails the new writer test.
  - Equivalent mutation: dropping `Object.hasOwn` inside handEditedKeys survives, because inherited prototype values are functions, never entry objects.
- Verified: 259 tests; all 5 quality commands and check:bundle pass.

## 2026-10-01 — toucan-ab (implementer), PR #1 review: writer tests
- Did:
  - Agreed Medium #2: the writer now lives in `src/core/settingsWrite.ts` (`SettingsFileWriter`, ports for VS Code's view, `update()`, the dirty documents' paths and debug logging, plus the verify timing). `src/settingsWriter.ts` is a thin adapter.
  - Nine new tests run against real files in a temp dir, with a fake view that either follows the file (like VS Code) or never does: regular-file temp+rename keeping comments and mode 0640; symlink kept and target inode unchanged; hard link kept; never reflected → byte-for-byte revert + update(); file changed during verify → left alone + update(); dirty via symlink → update() and file untouched; key absent → update(); no-op and "leave alone" write nothing; overlapping writes both land.
  - toucan-2c M1 on 8e3332b: the coordinator builds the updater itself (`(current) => customizationsFor(current, colors)`) and the port just passes it to the writer, so the coordinator tests (whose settings hold a user key) now cover the wiring.
  - toucan-2c L1: when the re-read shows the file changed, the writer recomputes the desired value from the current view, and the update() fallback writes the latest value.
- Proved by mutation (each red, then restored):
  - The coordinator's updater ignoring the current value fails 5 tests; the writer feeding the updater `undefined` fails one.
  - Dropping the symlink branch, the hard-link branch, the chmod, the revert, or the revert's guard each fail a test.
  - Comparing dirty files without realpath, on either side, fails a test (that needed a following view in the dirty test).
  - Not proven by a test: the L1 recompute (it needs a write between two reads in the same tick).
- Verified: 246 tests; all 5 quality commands and check:bundle pass; lint 0 warnings.

## 2026-10-01 — toucan-ab (implementer), no references to other projects
- Did (Marco's standing rule): the example repo name in the README, the tests and this log is now "webshop" instead of a name taken from another project, and a mention of a local temporary folder was reworded. Merged main (e92e83d). Searched all tracked files and the branch's commit messages for other projects' names and local paths: none left in branch-owned files. plan.md and decision 0007 still use the old example name; that's flagged to toucan-60, since those are planner files.
- Verified: all 5 quality commands and check:bundle pass.

## 2026-10-01 — toucan-ab (implementer), PR #1 review: writes from a fresh view
- Did (agreed Medium #1 and Low #8, judged valid):
  - `SettingsWriter.write` takes an updater (`SettingsUpdate`: current value → `{ value }`, or `undefined` to leave the setting alone). It's called inside the writer's lock with the user value as it is at that moment, and its result feeds both the in-place edit and the `update()` fallback.
  - The commands pass updaters (`withBackground`, `withGlyph`, `withoutRepo`), so Clear Color no longer writes back the `toucan.repos` it read before its dialog. Neither command reverts another window's change made while it waited.
  - The focus coordinator's port now takes the colors, and the adapter merges them onto the fresh view (`customizationsFor` in core/merge.ts, shared with the test fake). A user color saved while Toucan's write waited survives.
- Verified: 4 `customizationsFor` tests with literal values, plus a coordinator test where the user saves `tab.activeBorder` during a pending write. Mutations: merging onto `undefined` instead of the current value fails 9 tests; returning `undefined` for an unchanged merge fails 4. 237 tests; all 5 quality commands and check:bundle pass.

## 2026-10-01 — toucan-ab (implementer), PR #1 review: tests that can fail
- Context: toucan-6c's PR #1 review, agreed by toucan-60 and toucan-2c (6 Medium, 18 Low), judged independently by me. This commit covers Medium #4, #5, #6 and Low #22, applying the new test-quality rules in .claude/CLAUDE.md (main b584f91).
- #4: the fake sidebar takes a `silentClose` option, so Toucan's close produces no visibility event. The silent-close test now really exercises the reset of `closingByToucan` on the next focus change.
- #5: the remember-close test asserts "not yet" at 1499 ms and "remembered" at 1500 ms. A new test closes, reopens within the delay, and checks nothing is remembered.
- #6: the focus fake records which window wrote and can hold one window's colors write pending. A new test has A's blur timer fire while B's write is pending: the write log must be exactly [A, B], so A never clears. The plain handover test also pins the write log.
- #22: `passWithNoTests` removed. A wrong test glob now fails `pnpm test`.
- Proved by mutation (each red, then restored):
  - Deleting `this.closingByToucan = false` in setFocused fails a test.
  - `REMEMBER_CLOSE_DELAY_MS` of 0 or 1000 fails a test.
  - `cancelRemember()` and the timer's `if (!this.visible)` guard are redundant safeguards: removing either alone stays green (equivalent mutations); removing both fails the reopen test.
  - Writing the owner after the colors in takeOver fails the new ordering test; dropping the owner check in clearIfOwner fails 5 tests.
  - Changing the test glob to tests/** makes `pnpm test` fail.
- Verified: 232 tests; all 5 quality commands and check:bundle pass.

## 2026-10-01 — toucan-ab (implementer), lint warnings
- Did: cleared the two remaining oxlint warnings, which toucan-6c spotted as annotations on PR #1. The lock test uses one proportional delay instead of awaiting ticks in a loop (no-await-in-loop), and the Set Glyph items set `description` explicitly instead of a conditional spread (no-map-spread). Lint now reports 0 warnings.
- Verified: all 5 quality commands and check:bundle pass.

## 2026-10-01 — toucan-ab (implementer), erasable-only TypeScript
- Did (toucan-2c L1 on 9059c06): `erasableSyntaxOnly` in tsconfig, and the parameter properties in 8 files (`constructor(private readonly …)`) became explicit fields assigned in the constructor. Node's type stripping rejects parameter properties, so a script importing one of those modules would have failed. The compiler now enforces it. The GROUNDING convention says so.
- Verified: all 5 quality commands and check:bundle pass; plain `node` imports src/core/focus.ts, issues.ts and sidebar.ts.

## 2026-10-01 — toucan-ab (implementer), TypeScript everywhere
- Did (Marco's instruction via toucan-60):
  - All 92 relative imports in src/, test/ and scripts/ use explicit `.ts` extensions, with `allowImportingTsExtensions` in tsconfig (fine with `noEmit`; tsdown and vitest resolve them).
  - `scripts/check-bundle.mjs` → `.mts` with types for Node's internal `Module._load`. `pnpm check:bundle` runs it, also in CI.
  - `pnpm font` runs `node scripts/build-font.mts` (Node 24 type stripping), and tsx is removed.
  - `"type": "module"` with the bundle built as `dist/extension.cjs` (tsdown `fixedExtension`, main and .vscodeignore updated). This removed Node's MODULE_TYPELESS_PACKAGE_JSON warning when the font script imported src/core/glyphs.ts, and lets the configs be plain `tsdown.config.ts` / `vitest.config.ts`.
  - GROUNDING convention: TypeScript everywhere.
- Kept as JS, because they must be: the built `dist/extension.cjs`, and the spike reference code under `docs/plans/toucan-v1/assets/spikes/`.
- Still installed: esbuild (and tsx) come in through tsdown and vite, so `pnpm-workspace.yaml` keeps denying esbuild's build script.
- Verified: all 5 quality commands and check:bundle pass; `pnpm font` on plain node gives byte-identical media; `pnpm gen` is unchanged. In an isolated VS Code, the installed VSIX activates from `dist/extension.cjs` and shows the status bar item.

## 2026-10-01 — toucan-ab (implementer), unlock checks and emoji label spacing
- Fix (toucan-2c L1 on 5394c0c, confirmed in VS Code): with the plain-space prefix, a repo without a color left the title as "— webshop" (VS Code keeps a separator after a non-empty space). The template is now `${activeRepositoryName}` + the current title with no space, and the value carries its own trailing space ("🟦 "), or is empty for a repo without a color, so VS Code drops the separator.
- Isolated checks after the screen unlock (VS Code 1.139.1, installed VSIX, each instance closed right after):
  - Labels, when Toucan added the variable: "🟦 — webshop" (no editor), "🟦 file.ts — webshop" (file open), "file.ts — webshop" and "webshop" after Clear Color (no stray space or separator, name once).
  - User's own title with `${activeRepositoryName}${separator}${rootName}`: no dialog, "🟦 webshop — webshop". Turning the feature off hands the key back as "webshop — webshop" and leaves the title alone.
  - 0017 on the focus path: both comments in `workbench.colorCustomizations` survive apply and clear. After the clear the object is byte-identical to before. While applied, jsonc-parser puts the new keys before the last property's trailing comment, so that comment temporarily sits after the last Toucan key (cosmetic, like toucan-2c's L3).
  - 0017 copied-profile revert: a profile with its own settings and shared globalState (seeded `useDefaultFlags` in storage.json), with identical colorCustomizations in both files. Toucan edited the guessed default file; VS Code didn't pick it up in 4 s, so Toucan restored the default file byte-for-byte, logged "reverted it" and applied via update() to the profile's file. A bounded one-time stale rewrite followed, as designed in 1ee4441.

## 2026-10-01 — toucan-ab (implementer), 0017: serialize Toucan's own writes
- Did (toucan-2c on 6761d95):
  - M1: the focus coordinator and the commands share `SettingsWriter`, and in the default profile both settings live in User/settings.json. Two overlapping writes could each plan from the same text, and the later one could drop the earlier edit (worst case: a Set Color silently lost). Every read-plan-write-verify now runs under one lock (`src/core/lock.ts`, tested with overlapping tasks and with a failing task).
  - L2: the temp file gets `chmod` to the original mode before the rename (writeFile's mode was masked by the umask).
  - L4: `src/focus.ts` uses `settingsFiles().profile`, so the path derivation exists once and is tested.
  - L1 was already fixed in 85f70e7. L3 (jsonc-parser moves the trailing comment of a removed last property onto the previous one) is cosmetic and left as is.
- Verified: 2 lock tests, 230 total; all 5 quality commands and check-bundle pass.

## 2026-10-01 — toucan-ab (implementer), 0017 review lows
- Did (toucan-60 on 6761d95): the dirty check resolves `document.uri.fsPath` (on Windows `uri.path` is "/c:/…" and never matched). The README's comment caveat adds the window-switch race (a stale view in the newly focused window falls back to update()). Also corrected the test count in the 0017 entry (228).
- Verified: all 5 quality commands pass.

## 2026-10-01 — toucan-ab (implementer), edit settings in place (0017)
- Did:
  - `src/core/settingsEdit.ts` (pure, tested):
    - `planEdit` edits only when the key is in the file and deep-equals VS Code's view (H1). Otherwise it falls back.
    - One jsonc-parser `modify()` per changed property (each `commandCenter.*` key, each repo entry), keeping indentation and EOL. Removals go from the end.
    - Every edit is re-parsed and must hold exactly the desired value. jsonc-parser leaves `{ , // comment }` when removing the last property before a trailing comma and comment, and that now falls back.
    - `viewReflects` checks only the changed properties (toucan-2c low). `settingsFiles` derives this profile's file and the default profile's file for both directory layouts, including Windows paths (toucan-2c low).
  - `src/settingsWriter.ts`:
    - Fall back while the file is dirty in this window (realpath, Q1).
    - Re-read right before writing and re-plan once.
    - Write like VS Code (H2): in place through a symlink, in place for nlink > 1, otherwise temp next to it + rename keeping the mode.
    - Poll the view for up to 4 s. If it doesn't follow, restore the old text when the file still holds Toucan's text, then `update()`. Every fallback is logged at debug with its reason.
  - The focus coordinator writes `workbench.colorCustomizations` through it (this profile's file). The commands write `toucan.repos` through it (the default profile's file, A1). README explains when comments can still be lost.
- Verified: 14 planner tests, 228 total; all 5 quality commands and check-bundle pass. Isolated VS Code 1.139.1, via the commands:
  - Comments (top, inside, trailing) survive Set Color, and only the one value changes.
  - Symlinked settings.json: the link is kept and the target is edited in place.
  - Hard link: nlink stays 2 (VS Code's own update() breaks it).
  - Key absent: falls back to update(), with the reason logged.
  - Dirty editor: falls back, the file is untouched, and VS Code's own "unsaved changes" error shows.
  - A non-default profile ("Work") writes toucan.repos in place in the default profile's User/settings.json, and no profile settings file appears (A1 confirmed).
- Not yet verified: the copied-profile revert and comments in workbench.colorCustomizations go through the focus coordinator and need a focused window. The Mac's screen is locked, so those runs wait for the unlock, together with the search emoji label checks.

## 2026-10-01 — toucan-ab (implementer), search emoji review fixes
- Did:
  - toucan-60 M1, the repo name showed twice ("🟦 webshop — webshop"). When Toucan added the variable, the title prefix is a plain space and the key holds only the emoji (empty for a repo without a color). When the user's own title already used `${activeRepositoryName}`, the key stays emoji + name. Which case applies follows from `TitleChange.written`, so nothing new is stored (`repoVariableValue`, tested).
  - toucan-2c M1, a stale label: when Toucan set the key and then has nothing to show (entry cleared, feature off), it hands the key back as SCM would show it: the folder name when git has a repository open, otherwise empty.
  - toucan-2c L2: the README says to turn the emoji off before uninstalling.
- Verified: 2 new tests, 214 total; all 5 quality commands pass. Not verified in an isolated instance: the Mac's screen was locked (`loginwindow` in front), so no window could get OS focus, and the consent and label paths need a focused window. To re-check once it's unlocked.

## 2026-10-01 — toucan-ab (implementer), experimental search emoji (0007, 0015)
- Did: `src/core/windowTitle.ts` (pure, tested): put `${activeRepositoryName}${separator}` in front of the current or default title, and restore only while `window.title` is still what Toucan wrote, so the user's own later edit stays (0015's open follow-up). `src/searchEmoji.ts`:
  - When the setting is on and nothing is recorded yet, a modal explains the change. *Cancel* turns the setting back off; *Change Window Title* writes the title and records `{ previous, written }` in globalState.
  - A title that already contains the variable needs no change and no dialog.
  - Turning it off restores the previous value (unset stays unset).
  - Consent and restore run only in the focused window, both on the setting change and when a window gains focus (found in testing: with no window focused at the change, nobody would ever ask).
  - Every window with a configured repo sets `scmActiveRepositoryName` to `emoji + repo name` (emoji mapper, 0012 shapes) and reasserts it 50 ms after editor, focus and git repository events. The git extension is only activated while the feature is on.
- Also: `activate` catches a failing sidebar setup, so the status bar and Command Center keep working (toucan-2c note on 9f7ffad).
- Verified: 6 window title tests, 212 total; all 5 quality commands and check-bundle pass. In an isolated VS Code with a git repo:
  - Turning the setting on shows the dialog. Cancel → setting false, title untouched. Accept → `window.title` = `${activeRepositoryName}${separator}` + the 1.139 default, label "🟦 webshop — webshop".
  - The label survives two branch switches.
  - Off → restored (removed) at the next focus, label "webshop".
  - Regression asked by toucan-60: Developer: Reload Window with the sidebar block open isn't remembered as a close.
- Next: 0017 (edit settings in place, approved as 1ff9c9f).

## 2026-10-01 — toucan-ab (implementer), offer after a mid-session first color
- Found: the 0016 offer was only checked at activation and on focus changes. A repo that got its first color mid-session (Set Color) colored the Command Center border-only on compact mode, with no offer until the next focus change. Marco saw exactly that in one of my isolated test windows (since closed). Fix: the check also runs after every refresh. It still runs only when focused with a configured repo, and at most once per session.
- Verified: all 5 quality commands pass.

## 2026-10-01 — toucan-ab (implementer), sidebar review lows
- Did (toucan-60 L1 and toucan-2c L1–L3 on d3391ce):
  - Per-view listeners are disposed with their view, since VS Code can resolve the view again.
  - `activate` awaits the sidebar's `setContext` before the first reveal, so the reveal can't reach the workbench before the view's `when` clause allows it.
  - `closingByToucan` clears on the next focus change, so a close without a visibility event can't swallow the user's next real close.
  - The remember timer keeps running across a blur (close, then Cmd-Tab away is remembered). `dispose` still cancels it on reload or shutdown.
- Verified: 2 new tests, 206 total; all 5 quality commands pass.

## 2026-10-01 — toucan-ab (implementer), Agents control offer (0016)
- Did: `src/core/agentsControl.ts` (`agentsControlAction`, pure, tested) and `src/agentsControl.ts`. The check runs once per window session, only in the focused window of a repo that has a color.
  - It offers when the setting exists in this build (`inspect().defaultValue !== undefined`), the effective `get()` value is "compact" (including the default), and no workspace or folder value decides it. Those are toucan-2c's guards, agreed by toucan-60.
  - *Switch* writes "badge" to user settings. *Not now* is stored in globalState (per profile). Dismissing without answering asks again next session.
  - After a decline, one info line goes to the output channel. Toucan never changes the setting without asking and never changes it back.
  - README section explains the setting, the offer and the per-profile "Not now".
- Verified: 7 tests, 204 total; all 5 quality commands and check-bundle pass. In an isolated VS Code on the default: the offer appears; Switch writes `"badge"` and the classic `.command-center-center` is back. After removing the setting, Not now → restart → no offer, one info line, setting untouched.

## 2026-10-01 — toucan-ab (implementer), sidebar block
- Did: the opt-in sidebar block (0006, 0013).
  - Manifest: a `toucan` container in the secondary sidebar with the webview view `toucan.block`. Its `when` clause is the context key `toucan.sidebarBlockAvailable` (setting on and the repo has a color), so unconfigured repos and the setting being off show no view.
  - `src/core/sidebarHtml.ts`: no scripts, CSP `default-src 'none'; style-src 'unsafe-inline'`, the glyph as inline SVG, the escaped repo name. `full` is solid with the derived (opaque) foreground; `muted` is a 25% alpha fill with glyph and name in the repo color.
  - `src/core/sidebar.ts` (`SidebarController`, pure, fake-timer tests):
    - `always` reveals on startup unless closed in this workspace, and never closes the bar on startup.
    - A close counts when the block becomes invisible while the window is focused and Toucan didn't cause it, which includes switching the secondary sidebar to Chat. It's remembered (workspaceState) only after 1.5 s, so a reload or shutdown never records one, and brief false→true flips (seen while the command palette was open) are ignored.
    - Only the user's own open forgets the close; Toucan's reveals don't.
    - `unfocused` reveals on blur and, on focus, closes the bar only if Toucan opened it. Toucan's closes are never remembered.
    - Reveals don't overlap.
  - `src/sidebar.ts`: reveals via `toucan.block.focus` with `preserveFocus` and closes via `workbench.action.closeAuxiliaryBar`.
  - *Toucan: Toggle Sidebar Block*: open/close. When the block is off, it offers to turn it on and forgets an earlier close.
- Verified: 22 controller and HTML tests (including script-free CSP, name escaping, reload during the delay, mode switches), 197 total; all 5 quality commands and check-bundle pass. In an isolated VS Code 1.139.1 via CDP:
  - Revealed on start with focus kept in the editor.
  - "View: Close Secondary Side Bar" → remembered (`{"sidebarBlock.closed":true}` in workspace storage), and a restart stays closed.
  - Toggle reopens it.
  - Developer: Reload Window with the block open → not remembered.
  - Switching to Chat → remembered.
  - `unfocused`: Finder reveals it, coming back closes it, and the close is ignored.
  - Full and muted screenshots match 0013.
- Next: the 0016 Agents control offer, then the experimental search emoji.

## 2026-10-01 — toucan-ab (implementer), deactivate must not throw
- Found while testing the sidebar with Developer: Reload Window. During shutdown the "Toucan" output channel can already be closed when `deactivate` runs the coordinator's best-effort clear. A warning then threw "Channel has been closed", and the rejection escaped `deactivate` (exthost log stack: `FocusCoordinator.dispose` → `Module.deactivate`).
- Fix: the adapter's `warn`/`debug` swallow logging errors (`safeLog`), and the queue's error handler can't throw either. A test checks that `dispose` resolves when both the write and the logger throw.

## 2026-10-01 — toucan-ab (implementer), command review fixes
- Did (toucan-2c on 2365b6f):
  - M1: Clear Color asks with a modal before removing an entry that holds more than a background, and the dialog lists what would be lost. A bare color clears without asking.
  - M2 and L2: the status bar preview is now an overlay (`StatusBarIndicator.preview`). Refreshes update the saved state underneath without interrupting it, and the overlay ends after the save finishes or fails. So a failed save shows the old value instead of the unsaved one.
  - L1: a comment on `readRepos` about a just-opened window's possibly stale view.
- Plan note from toucan-2c for Marco's comment decision: every command rewrites the whole `toucan.repos` object, so comments inside it are stripped too, not only inside `workbench.colorCustomizations`.
- Verified: 178 tests; all 5 quality commands and check-bundle pass. In an isolated VS Code (`window.dialogStyle: "custom"` so the dialog renders in the page), Clear on `{ background, glyph, foreground }` shows "including glyph, foreground"; Cancel keeps the entry and Clear removes it. Set Color saves and the status bar shows the new color.

## 2026-10-01 — toucan-ab (implementer), commands
- Did: *Set Color for This Repo* (input box, any opaque CSS color, translucent values rejected with a message), *Pick Preset Color* (the 16 presets from 0014, `src/core/presets.ts`, each with an SVG swatch in the repo's glyph shape), *Set Glyph* (the 8 glyphs, swatches in the repo color; asks to set a color first when the repo has no entry) and *Clear Color*. Contributed with category "Toucan" and shown in the palette only when a folder is open; ids come from the generated `commands`.
- Live preview: typing or moving through a pick updates this window's status bar indicator only, with no settings writes per keystroke. Escape restores it, and the real value returns via the settings change on accept. No live Command Center preview, which would mean a settings write per keystroke.
- Writes: the pure `src/core/entries.ts` edits the raw `toucan.repos` value. A string entry stays a string when only the background changes, Set Glyph turns it into an object, other fields (overrides, extra keys) are kept, and Clear removes the entry (and the setting when it's empty). A preset is stored as its hex (0014).
- Status bar: click runs Set Color, and the tooltip links to all four commands with `isTrusted: { enabledCommands }` limited to Toucan's commands (toucan-2c). `supportThemeIcons` is set before `appendText`, so `$(…)` in a repo name stays escaped in the tooltip.
- Verified: 11 entry/preset tests, 178 total; all 5 quality commands and check-bundle pass. In an isolated VS Code 1.139.1 with the installed VSIX, driven through CDP input events:
  - The preset pick shows all 16 swatches and previews on an unconfigured repo; Escape restores, Enter saves `"webshop": "#e0620b"`, and the Command Center applies it.
  - Set Glyph shows colored shape swatches with "current", previews the star, and saves `{ background, glyph: "star" }`.
  - Set Color rejects garbage ("Not a color.") and `rgb(0 0 0 / 50%)` (opaque message), previews `rebeccapurple` as a purple star, and Enter saves `#663399` inside the object.
  - The tooltip shows the swatch, name, hex and links, and clicking "Clear" removes the entry and clears the Command Center while leaving other repos' entries.
- Next: sidebar block (opt-in), then the experimental search emoji.

## 2026-10-01 — toucan-ab (implementer), focus coordinator lows
- Did: blur delay 500 → 1000 ms (toucan-2c L2). It only affects leaving VS Code, saves writes on brief app switches and widens the race margin. README notes that profiles with shared settings but separate global state have separate owners, so the color can flicker between them (toucan-2c L1). It's healed by the self-heal check, and there's no profile-independent storage in stable API.
- Waiting on Marco: chat.agentsControl "compact" hiding the background (finding on 4db9664), and toucan-2c's M1, that whole-object `update()` strips comments inside `workbench.colorCustomizations`.
- Also (toucan-2c L1 on 7316450): a file that persistently differs from the view (another profile's) caused a rewrite on every check. The coordinator now remembers the file snapshot it last rewrote for, and skips while the file still shows it; the snapshot resets once file and view agree. A test checks that the writes stay bounded.
- Verified: 167 tests; all 5 quality commands pass.

## 2026-10-01 — toucan-ab (implementer), H1: merge base from VS Code's view
- Finding (toucan-60, HIGH; toucan-2c and toucan-ab agree): 4db9664 built the written value on the `settings.json` it guessed from `globalStorageUri`. In 1.139.1's main.js, a profile's `settingsResource` and `globalStorageHome` follow independent `useDefaultFlags` (`settings` and `globalState`). So a profile with its own settings but shared global state resolves to the default profile's file, and Toucan would write that profile's color keys into this one: silent data loss.
- Fix: every write is built on `inspect().globalValue`, VS Code's view of this window's own file. The disk read is now only `readCustomizationsFromDisk`: if the view says "nothing to do" but the file disagrees, the view-based value is written anyway. A wrong or unreadable file can cost at most one redundant write. A malformed view never writes.
- Remaining exposure (documented): a window whose view is stale about the user's *own* keys (edited in another window while this one was starting) writes the stale values back on its next write. VS Code's own `update()` has the same exposure.
- Verified: 4 new tests (wrong-profile file keeps the view's keys, stale file forces a rewrite, unreadable file, malformed view). 166 tests; all 5 quality commands and check-bundle pass. Isolated VS Code rerun: the second "webshop" window logs "settings view is stale; rewriting" and gets its color; webshop, toucan, an unconfigured window, and Finder → back all behave; a `[Default Light Modern]` block and `editor.background` survive every write.

## 2026-10-01 — toucan-ab (implementer), focus coordinator
- Did: the pure `src/core/focus.ts` (`FocusCoordinator`) and the VS Code adapter `src/focus.ts`, as designed with toucan-60:
  - Only real `focused` transitions act (`active`-only events are ignored).
  - On focus: cancel the pending blur timer, write the owner, apply the colors if they changed, and schedule a self-heal check at 750 ms.
  - On blur: after a 500 ms debounce, re-read the owner, and clear only if this window is still the owner.
  - `refresh()` and `customizationsChanged()` only act in the focused window. All writes from one window run one at a time.
  - A write failure is logged once per streak, never as a notification.
  - `deactivate` clears on a best-effort basis if this window is the owner.
- Owner: `owner.json` in global storage (local to the machine, because Toucan is a UI extension), written via temp file + rename. An unreadable file counts as "not me".
- Startup cleanup is lazy: the first window to gain focus overwrites or clears leftovers. An unfocused window never writes. `window.state.focused` is fed in once the repo is resolved. Uninstall after a crash (Kingfisher #4) is out of scope for v1.
- Two changes from the agreed design, both found in the isolated instance:
  1. A window's in-memory settings view can lag indefinitely. A new window missed the clear that the previous window wrote while it was starting, saw "colors already applied", and stayed uncolored. The coordinator now reads `settings.json` from disk (`globalStorageUri/../../settings.json`, parsed with jsonc-parser), falling back to `inspect().globalValue`. VS Code's `update()` writes even when its own view is stale.
  2. The focused owner re-checks on `workbench.colorCustomizations` changes (`customizationsChanged`). It doesn't loop: only the focused owner writes, and only on a real difference.
- jsonc-parser is imported from `lib/esm/main.js`: its UMD main broke in the bundle ("Cannot find module './impl/format'"), so the extension didn't activate. CI now runs `scripts/check-bundle.mjs`, which loads `dist/extension.js` in Node with a `vscode` stub.
- Debug logging: focus, ownership, verify and blur decisions go to the Toucan channel at debug level.
- Verified: 15 coordinator tests, including two simulated windows sharing the owner file and settings, A→B→A, same-repo handover, a stale read, self-heal, write failures, dispose and an unreadable owner. 162 tests; all 5 quality commands pass. Isolated VS Code 1.139.1 with the installed VSIX, three windows plus a second folder also named "webshop":
  - webshop applies, then the second "webshop" re-applies after the first one cleared.
  - toucan takes over; an unconfigured window clears.
  - Switching to Finder clears after the debounce, and coming back re-applies.
  - After a kill left colors behind, a focused unconfigured window cleaned them up.
  - Switching between two already-open windows wasn't driven (no Accessibility permission for this shell); it's covered by unit tests and the new-window handovers.
- Finding (raised with toucan-60 and Marco, may change 0002): in VS Code 1.139, `chat.agentsControl.enabled` defaults to `"compact"` (experimental). That replaces the Command Center with an agent-status pill whose background is forced transparent, so Toucan shows only the border and text color. With `"badge"` or `"hidden"`, the whole Command Center is colored (CDP screenshots of all three modes).

## 2026-10-01 — toucan-ab (implementer), status bar review fixes
- Did: `$(` in a folder name is escaped as `\$(` (`escapeIcons`), so `x$(bug)` shows as text instead of an icon (both reviewers' L1). VS Code's label renderer (1.139.1 source) prints `\$(x)` as a literal `$(x)`. `IssueReporter` moved to the pure `src/core/issues.ts` behind a two-method log interface, with tests. It starts as "no issues", so a clean config logs nothing at startup (toucan-2c L2, L4). README and a code comment say the key is the folder's display name, which a `.code-workspace` can set (toucan-2c L3).
- For the commands item (toucan-2c): tooltip action links need `isTrusted: { enabledCommands: [...] }` limited to Toucan's commands, never `isTrusted = true`.
- Verified: 147 tests; all 5 quality commands pass.

## 2026-10-01 — toucan-ab (implementer), repo resolver and status bar indicator
- Did: `src/repo.ts` (`resolveActiveRepo`: first workspace folder name, looked up in the parsed `toucan.repos` via the generated `configs.repos.key`; `IssueReporter` logs parser issues to the "Toucan" log output channel, only when they change). `src/statusBar.ts`: one left item at `Number.MAX_VALUE` priority with id `toucan.indicator` and name "Toucan", text `$(glyph) repo`, `color` = background, an accessibility label, and a markdown tooltip with the glyph swatch (SVG data URI), repo name and hex. Hidden for repos without an entry (0008). `extension.ts` refreshes on `toucan.repos` changes and on workspace folder changes. A comment on `FALLBACK_ICON` says font load failures can't be detected (toucan-60 L2 on c62154c).
- Not yet: the tooltip action links and the click → Set Color command come with the commands item; a low-contrast warning (plan risk) is still open.
- Verified in an isolated VS Code 1.139.1 (clean env, a temp-directory user-data-dir, `--extensionDevelopmentPath`): it activates on startup and logs the broken test entry once. Pill, bar, square and heart render at the right height after the remote indicator, without overlapping the name (screenshots). Switching the glyph in settings.json updates live, and removing the entry hides the item. The tooltip hover wasn't checked here (needs a mouse); the spike already showed that SVG data URIs render in tooltips.
- CI: the runs from the merger through ca4d451 failed on GitHub, because setup-node@v5 looked for pnpm before `corepack enable`. I hadn't checked CI after pushing. toucan-6c (DevOps) fixed it in 0fb7459. I now check CI after every push.
- Next: focus coordinator (own commit).

## 2026-10-01 — toucan-ab (implementer), icon font
- Did: `pnpm font` (`scripts/build-font.mts`, run with tsx) builds `media/toucan-icons.woff` and `media/icons/{square,bar,pill}.svg` from `glyphSvg` in `src/core/glyphs.ts`, using svgicons2svgfont → svg2ttf → ttf2woff. Codepoints as in the spike (pill E000, square E001, bar E002), now `FONT_CODEPOINTS`. `contributes.icons` registers `toucan-square`, `toucan-bar` and `toucan-pill`. VS Code accepts ttf, woff and woff2 for icon fonts (checked in the 1.139.1 workbench source).
- Metrics: 1000 upm, ascent 875, descent 125 (as in the spike). Advance width equals the real glyph width (toucan-2c's note): square 1000, bar 375, pill 2750. Outlines checked with fontTools: square spans 63–938 × −62–813, and the pill has rounded ends. svg2ttf doesn't recompute the bbox header fields, which doesn't affect rendering.
- Reproducible: svg2ttf gets `ts: 0`, so two runs give byte-identical output. CI now runs `pnpm font` and fails on a diff in `media/`. The VSIX ships only the `.woff`, not the SVG sources.
- Tooling: tsx runs the script, because Node's type stripping can't resolve the extensionless imports. pnpm denies esbuild's postinstall (tsx's esbuild loads its binary from the platform package). `scripts/vendor.d.ts` types svg2ttf and ttf2woff.
- Verified: a manifest test checks that the icon ids and `fontCharacter` values match `FONT_CODEPOINTS`. 142 tests; all 5 quality commands pass. How it renders in a real status bar is checked with the status bar item.
- Next: repo resolver and status bar indicator (one commit), then the focus coordinator (its own commit).

## 2026-10-01 — toucan-ab (implementer), `always` visibility description
- Did: the `always` enumDescription follows the updated 0013. The block stays closed in the workspace once you close it or switch the secondary sidebar to another view, until Toggle Sidebar Block opens it again. The command itself comes with the sidebar item.
- For the sidebar item (toucan-2c): check in an isolated instance whether Reload Window and window close fire `onDidChangeVisibility(false)` or only `onDidDispose`. Count only visibility=false while focused as a close, never dispose. If reload does fire visibility=false, write the flag after a short delay so shutdown wins.

## 2026-10-01 — toucan-ab (implementer), emoji follow-ups
- Did: star uses square emoji, per Marco's 0012 update (8ee69b8), so the color survives. Hues are now measured from Apple Color Emoji (toucan-2c L1): I rendered 🟥🟧🟨🟩🟦🟪 with AppKit and averaged the opaque pixels, which gives red 30, orange 61, yellow 90, green 143, blue 261, purple 311. Apple's are more saturated, and green and blue sit further apart than in Twemoji. No preset changes category. Teal (`#14939c`, hue 203) is now nearly tied between green and blue but stays blue. A comment notes that other emoji fonts can differ at borderline hues.
- Verified: 141 tests; all 5 quality commands pass.

## 2026-10-01 — toucan-ab (implementer), codicon glyph shapes
- Did: toucan-60 M1 on d004785. The five codicon glyphs (circle, double-circle, heart, star, check-circle) now draw their codicon's own path from @vscode/codicons 0.0.46, so the tooltip swatch and the sidebar block match the status bar icon. `record` turned out to be a dot inside a thin ring, so double-circle keeps its shape. The README credits Codicons (© Microsoft, CC BY 4.0); the package was read from npm into a temporary folder and isn't a dependency.
- Verified: rendered the five shapes to PNG and compared them with the codicon SVGs. 140 tests; all 5 quality commands pass.
- Note for the icon-font item (toucan-2c): give the font glyphs an advance width that matches their real width. Pill is 2.75 em and would overlap the repo name in a 1 em slot; bar is narrow and may leave an odd gap.

## 2026-10-01 — toucan-ab (implementer), emoji mapper
- Did: `src/core/emoji.ts`. `emojiColor(hex)` classifies by OKLCH, because a plain nearest-color distance (tried in OKLab with several weightings) sent Beak Orange to 🟫, Silver to 🟪, and dark green and navy to ⬛. Chroma below 0.045 gives black or white (split at L 0.6). L below 0.55 with hue 35–100 gives brown. Everything else gets the nearest of the six Twemoji hues (measured from 🟥🟧🟨🟩🟦🟪). `emojiFor(hex, glyph)`: squares for square, bar and pill; circles for circle, double-circle and check-circle; hearts for heart; ⭐ for star.
- Open question (to toucan-60): the plan maps star to ⭐, which only exists in yellow, so a starred repo's emoji never shows its color. Options: keep ⭐ (plan as written), or fall back to squares for star so the color survives.
- Choice: double-circle and check-circle use circles rather than squares (closest shape). Pinks map to red, the nearest hue; there is no pink in the classic set (🩷 is Unicode 15).
- Verified: every 0014 preset classifies sensibly (table in emoji.test.ts), and every glyph gives one grapheme per category. 140 tests; all 5 quality commands pass.
- Next: follow-up on toucan-60's d004785 M1 (match the SVGs to the real codicon shapes), then the VS Code layer.

## 2026-10-01 — toucan-ab (implementer), glyph resolver
- Did: `src/core/glyphs.ts`. `glyphIcon` maps a glyph to `$(toucan-square|bar|pill)` (Toucan's font) or the codicons from 0012 (`circle-large-filled`, `record`, `heart-filled`, `star-full`, `pass-filled`). `glyphSvg(glyph, color, height)` draws a standalone SVG, 16 units high, keeping each glyph's aspect ratio (bar 6:16, pill 44:16), and `svgDataUri` base64-encodes it, as in the status bar spike. `FALLBACK_ICON` is `circle-large-filled`.
- Choices: the SVG shapes in this module are meant as the single source for the icon-font work item, whose generator can import them. `pill` has rounded ends here; the spike's `mkfont.py` drew it as a plain 3:1 rectangle. `$(toucan-*)` only renders once the font work item contributes the icons.
- Verified: rendered all eight shapes to PNG with `qlmanage` and checked them visually. 18 tests, 106 total; all 5 quality commands pass.
- Notes for the VS Code layer (toucan-2c): read the current colors with `inspect("workbench.colorCustomizations").globalValue`, never `get()`, which would copy defaults and workspace values into user settings. Report `commandCenter.*` keys in the active theme's block.
- Next: emoji mapper.

## 2026-10-01 — toucan-ab (implementer), customizations merger
- Did: `src/core/merge.ts`. `mergeCustomizations(current, colors | undefined)` replaces or removes every top-level `commandCenter.*` key (including ones Toucan doesn't derive, such as `debuggingBackground`) and keeps all other keys in their order. It returns `{ changed: false }` when the `commandCenter.*` entries already match, in any order, so callers skip the write. When clearing leaves the object empty, the result is `undefined`, which removes the setting. A non-object current value is never overwritten. The input is never mutated; `__proto__` keys stay plain data. `hasToucanKeys` is for startup cleanup.
- Settled (toucan-60): theme-scoped blocks such as `"[Default Dark Modern]": { "commandCenter.background": … }` are left alone, as 0003 already covers. The README explains that they override Toucan for that theme, and that commandCenter.* values from before Toucan are replaced and later removed. For the VS Code layer: log one output-channel line when the active theme's block holds commandCenter.* keys.
- Verified: 17 merger tests, 88 total; all 5 quality commands pass.
- Next: emoji mapper and glyph resolver (the remaining pure modules).

## 2026-10-01 — toucan-ab (implementer), color deriver review fixes
- Did: a branded `Hex` type (`src/core/model.ts`), produced only by `toHex`. `RepoConfig`, the overrides and `deriveColors` take it, so raw setting strings can't reach the deriver, which only throws on unreachable input (toucan-60 L1). A comment on `deriveColors` marks the known limit that a user-set foreground isn't checked against the derived hover background (toucan-60 L2). Dark backgrounds now shift from at least OKLCH L 0.2 (`MIN_DARK_LIGHTNESS`). Before, `#000000` hovered as `#010101`; now `#242424` with a `#333333` border. Plumage Black moves from `#1e2124` to `#212428` (toucan-2c L1).
- Verified: a test over all 256 grays asserts hover contrast > 1.15 and border > 1.4 (measured minimum 1.17 and 1.43, at `#161616`). 71 tests; all 5 quality commands pass.

## 2026-10-01 — toucan-ab (implementer), color deriver
- Did: `src/core/derive.ts`, `deriveColors(background, overrides)`. The foreground is black or white, whichever has the higher WCAG contrast. Dark vs. light uses the same test, so it doesn't depend on a foreground override. `activeBackground` shifts OKLCH lightness by ±0.06 and `border` by ±0.12 (lighter on dark, darker on light), clamped to [0, 1], with the result gamut-mapped by `toHex`. `activeForeground` and `activeBorder` reuse the foreground and border. `inactiveForeground` multiplies the foreground alpha by 0.6, `inactiveBorder` the border alpha by 0.5. Overrides win, and derived values build on them. The amounts are exported constants for the visual tuning that 0004 asks for.
- Verified: 26 deriver tests (every 0014 preset plus black and white give a complete, valid hex set; contrast picks; lightness shift direction and size; overrides). 70 tests total; all 5 quality commands pass.
- Next: customizations merger.

## 2026-10-01 — toucan-ab (implementer), config parser review fixes
- Did: addressed the toucan-60 review of 7cb5047. A translucent background (alpha < 1, including `transparent`) is made opaque and reported, because the foreground contrast, the status bar glyph and the sidebar block all assume an opaque color. Override colors keep their alpha. `toHex` maps out-of-gamut colors into sRGB with `toGamut("rgb", "oklch")`, which keeps the hue (`oklch(0.7 0.4 30)` becomes `#ff5843`, not `#ff0000`). In-gamut colors skip it, because the OKLCH round trip turned `#008000` into `#007f00`. The glyph message uses `DEFAULT_GLYPH`.
- Also (toucan-2c review): an alpha that rounds to `ff` counts as opaque, so `/ 0.999` gives `#rrggbb` and the merger can compare values reliably. A non-string background now says it isn't a color string, instead of reporting it as missing.
- Also: a fully transparent background (alpha rounds to 0, e.g. `transparent`) drops the entry instead of silently becoming black (toucan-2c). Parser issues must surface somewhere visible (output channel or notification) once the VS Code layer exists (toucan-60).
- Verified: 44 tests; all 5 quality commands pass.

## 2026-10-01 — toucan-ab (implementer), config parser
- Did: `src/core/model.ts` (Command Center keys, glyphs, visibilities), `src/core/color.ts` (registers culori's CSS color spaces via `culori/fn`, normalizes any CSS color to `#rrggbb`, or `#rrggbbaa` when translucent) and `src/core/config.ts` (`parseRepos`: string or object entries; an invalid or missing background drops the entry; an invalid glyph, sidebarBlock or override is ignored and reported; unknown keys are reported). README notes the user-only, cross-profile settings scope.
- Fix: tsdown `alwaysBundle`/`onlyBundle` now match `culori` subpaths (regex). With the plain `"culori"` string, `culori/fn` stayed an external `require`, which would crash the VSIX. Checked with a test build that imports the color module: the bundle has no culori require and runs in plain Node. culori adds about 55 kB (12 kB gzip) with all CSS spaces.
- Verified: 38 unit tests, including a check that the package.json enums match the code constants. All 5 quality commands pass.
- Next: color deriver.

## 2026-10-01 — toucan-ab (implementer), scaffolding review fixes
- Did: addressed the toucan-60 and toucan-2c reviews of c98806d. Added `@types/culori` (culori 4 ships no types; checked with a probe import of `culori/fn`). All `toucan.*` settings are `scope: application`, so a repo's `.vscode/settings.json` can't override them. Added `extensionKind: ["ui", "workspace"]` so Toucan runs next to the UI in remote windows, and declared support for untrusted and virtual workspaces. CI fails when `pnpm gen` output drifts. Commented why the tsdown target (node22) differs from `.nvmrc`. The VSIX now ships the source map.
- Open: the `always` visibility enumDescription still says "once on startup". It will be updated once Marco decides whether switching tabs counts as a close (toucan-2c M1 on fb33eb6).
- Verified: all 5 quality commands pass, the drift check passes locally, and `pnpm package` gives a 7-file VSIX.
- Next: pure modules (config parser, color deriver, customizations merger).

## 2026-10-01 — toucan-ab (implementer)
- Did: scaffolding on `feat/toucan-v1`. package.json (pnpm 12.8.1 via corepack, `engines.vscode ^1.138.0`, full `contributes.configuration` schema for the locked setting names, scripts for the GROUNDING quality commands plus `gen` and `package`), tsconfig for TS 7, tsdown, oxlint, oxfmt, vitest, vscode-ext-gen output in `src/generated/meta.ts`, `.nvmrc`, `.vscodeignore`, MIT LICENSE, README, CI on push and a manual VSIX workflow. `src/extension.ts` is an empty activate/deactivate stub.
- Notes:
  - Config files are `tsdown.config.mts` and `vitest.config.mts`: the package stays CommonJS for the extension host, so `.ts` configs loaded as CJS and warned.
  - tsdown externalizes `dependencies` by default and the VSIX is packaged with `--no-dependencies`, so culori is forced into the bundle (`deps.alwaysBundle`, guarded by `onlyBundle`). tsdown logs a hint until culori is imported.
  - pnpm 12 fails on unapproved build scripts; `pnpm-workspace.yaml` denies `@vscode/vsce-sign` (signing binary, not needed for a local VSIX).
  - Commands are not contributed yet; each command work item adds its own entry and reruns `pnpm gen`.
  - oxfmt added blank lines under the headings in GROUNDING.md. `docs/` is excluded from lint and format.
- Verified: lint, format:check, typecheck, test (no tests yet, `passWithNoTests`), build all pass; `pnpm package` produces a 6-file VSIX.
- Next: pure modules (config parser, color deriver, customizations merger).
