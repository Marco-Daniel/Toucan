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
