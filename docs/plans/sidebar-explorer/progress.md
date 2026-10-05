# Progress: The sidebar block lives in the Explorer

<!-- Living log. Implementers append newest entries at the top. The planner
     leaves this body empty. Each entry: date, who/what, what changed, what's
     next or blocked. -->

## 2026-10-05, implementer

- Did: the visibility finding (decision 0006, own commit), then the build on branch `sidebar-explorer`.
  - Code: `toucan.block` contributed to `views.explorer` with `when: toucan.sidebarBlockAvailable && toucan.sidebarBlockShown`; the container, `closeBar`, focus handling and `unfocused` gone from `SidebarController`; a dispose with the shown key still true is remembered as a Hide after `REMEMBER_CLOSE_DELAY_MS` unless the view is resolved again; Toggle hides a visible block and shows a hidden or collapsed one; reveal once per workspace (`sidebarBlock.revealed`) and on becoming available. The visibility setting and the per-repo field stay in the manifest, deprecated and ignored.
  - Tests: `sidebar.util.test.ts` rewritten (each case pins the exact port calls and their order), `manifest.test.ts` for the new contribution.
  - Docs: extension README, site docs (sidebar, settings, docs list, feature card), toucan-v1/0006 and 0013 marked superseded, ADR-0016 pointer, the two sidebar images regenerated.
  - docs-sync: run against this branch (`--since origin/main`) with a text sweep for the old wording; one stale comment fixed in `config.util.ts`; nothing else found.
- Isolated VS Code test (throwaway profile, real drag events over DevTools): block lands last in the Explorer; collapse and expand; drag to the top of the Explorer; drag into the secondary sidebar and back (View: Move View); Hide from the header's context menu; reload while hidden stays hidden; Toggle on a hidden block shows it, on a shown block hides it, on a collapsed block expands it; extension host restart; Toucan disabled at launch and enabled again at the next; repo without a color; upgrade from the released 1.0.0 with the block open in the secondary sidebar. None of the drags, the restart or the enable/disable recorded a close; the Hide did.
- Seen, not caused by this change: from the second launch of the same throwaway profile on, VS Code shows "Error loading webview ... Could not register service worker". The released 1.0.0 shows it the same way, so it isn't a regression of this change.
- Next: send the screenshots to the lead for Marco; the review loop; then the bump PR (0005).

## 2026-10-05, implementer, round 1 fixes

- Did: the two agreed round-1 findings (decision 0007).
  - The manifest view has `"visibility": "visible"`; Toucan no longer reveals by itself (no `start`, no `settingsChanged`, no "revealed" flag); only Toggle (show) runs `.focus`.
  - The remembered hide is the new workspaceState key `sidebarBlock.hidden`; 1.0.0's `sidebarBlock.closed` is ignored.
  - Tests: the reveal and settings-change groups are gone, replaced by one that pins "no reveal of its own"; the manifest test pins `visibility`; toggle failure test added. README, site docs, plan and trail updated.
- Next: the isolated VS Code test for this (fresh profile with the setting on, the setting turned on mid-session with Search open throughout, upgrade with an old close flag set), once the lead has Marco's go.

## 2026-10-05, implementer, round 1 second half

- Did: the isolated VS Code test of the round 1 fix (A fresh profile, B Search open with the setting turned on mid-session, C Search open at launch, D upgrade with 1.0.0's close flag set). The new key and the no-switching are proven; the block always starts collapsed because VS Code ignores `visibility` for Explorer views. Marco chose to reveal once when the user turns the block on (decision 0008).
  - Code: `SidebarController.settingsChanged()` reveals on the setting going from off to on while the window runs, when the block is available and not remembered hidden; the adapter's `settingsChanged()` refreshes the context keys first. The manifest no longer declares `visibility`.
  - Tests: eight cases for the transition (reveals; not on startup; not when a repo gets a color; not without a color; not when hidden; not on a style change; repeated; failure logged), each mutant-checked by hand.
  - Docs: README and site say the block starts collapsed and when Toucan expands it.
- Next: a short isolated VS Code rerun (Settings UI turn-on with Search open; a reload), then reply on and resolve both threads.

