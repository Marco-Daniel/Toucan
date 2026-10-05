# Plan: The sidebar block lives in the Explorer (v1.1.0)

## Goal

The opt-in sidebar block moves its default home from the secondary sidebar into the **Explorer** in the primary sidebar (→ 0001). The `unfocused` visibility mode goes away; the block is simply there while it's on, until the user hides it (→ 0002). The change is tested in an isolated VS Code before any version is made (→ 0004) and ships as **v1.1.0**, on GitHub and the Marketplace (→ 0005).

## Non-goals

- Forcing the block to the top of the Explorer: VS Code places it (→ 0003).
- A new Activity Bar icon or view container.
- Any change to the block's look (`full`/`muted`), to the Command Center or status bar colors.
- Automatic Marketplace publishing: v1.1.0 goes up by hand, through `/marketplace-upload` (marketplace-upload/0001).

## Approach

**Where it lives.** The webview view `toucan.block` is contributed to `views.explorer` instead of a `secondarySidebar` container, and the container is removed. The view id stays the same, so a user who dragged the block somewhere keeps that spot; VS Code restores moved views by id.

**What showing and hiding means now.** In the secondary sidebar, "closing" the block meant closing the bar or switching it to another view, and Toggle Sidebar Block closed the bar. In the Explorer neither fits: closing the sidebar would hide the user's Explorer, and Toucan must never switch the primary sidebar's view (toucan-v1/0006's reason for avoiding Kingfisher's behaviour). The implementer's first task is a finding, before code: in the isolated VS Code, record what `onDidChangeVisibility` and the view's state report when the block is collapsed, when the Explorer is hidden, when another primary sidebar view (Search, Source Control) is shown, and when the view is hidden from the Explorer's "…" menu. The close design follows from that and is written up as a decision in this plan. The starting proposal: Toggle Sidebar Block hides and shows the view through its `when` clause, with a context key fed from the remembered "closed" state (the same workspaceState key, so no migration); collapsing is not a close.

**Dropping `unfocused` (→ 0002).** The `toucan.sidebarBlock.visibility` setting and the per-repo `visibility` field stay in the manifest for this release with a deprecation message, and Toucan ignores them: every block behaves as `always`. The reveal-on-blur and close-on-focus code paths, and the `closeBar` port as it stands, are removed.

**Testing (→ 0004).** The implementer tests in an isolated VS Code (the screenshots harness, CDP) and sends Marco screenshots: turning the block on, where it lands, dragging it to the top, hiding it and reloading, Toggle Sidebar Block both ways, a repo without a color, and an upgrade from 1.0.0 with the block open in the secondary sidebar. Marco's OK on those screenshots comes before the bump PR.

**Release (→ 0005).** A bump PR to 1.1.0 with `release-notes.md` (ADR-0013), the draft release, Marco's per-release OK to DevOps, then `/marketplace-upload 1.1.0` and Marco's hand upload. After the release, the site's releases.json snapshot is refreshed.

## Components

- `apps/extension/package.json`: the view contribution, the removed container, the deprecated settings, setting descriptions; regenerated `src/generated/meta.ts`.
- `apps/extension/src/features/sidebar/`: `SidebarController` without `unfocused`, the new hide/show path, the adapter's ports; `ids.consts.ts` comments.
- Tests: `sidebar.util.test.ts` and the adapter tests, rewritten for the new behaviour; each must be able to fail.
- Screenshots: `scripts/screenshots/scenes.mts` scenes for the block in the Explorer; the README and site images regenerated.
- Docs in the same PR: `apps/extension/README.md` (Sidebar block, Settings); the site's `sidebar.md`, `settings.md`, `docs.consts.ts`, `features.view.tsx`; toucan-v1/0006 and 0013 marked superseded by 0001 and 0002; ADR-0016's line that Cursor reserves the secondary sidebar gets a pointer that the block no longer needs it. `/docs-sync` before the round.
- The bump PR: version, `release-notes.md`; later the releases.json snapshot.

## Data flow

1. The user turns `toucan.sidebarBlock.enabled` on, for a repo with a color.
2. The context key makes `toucan.block` visible in the Explorer; Toucan reveals it with `preserveFocus` unless it's remembered as hidden in this workspace.
3. Hiding it (Toggle Sidebar Block, or the way the finding settles) writes the workspaceState flag; showing it clears the flag.
4. Settings, repo and theme changes re-render the webview as today.

## Risks

- **Visibility events differ in the Explorer.** A collapsed view, a hidden Explorer and a hidden view may all look the same to the extension. Mitigation: the finding comes first, and the design follows it.
- **The block lands low in the Explorer** (below the folder tree, in a crowded Explorer). Mitigation: Marco judges it on the screenshots; the README says it can be dragged.
- **Upgrade from 1.0.0.** Users with the block open in the secondary sidebar may see it jump, or VS Code may keep a stale container. Mitigation: an explicit upgrade test in the isolated VS Code.
- **Leftover `unfocused` settings.** Mitigation: deprecation messages, and a test that an `unfocused` value behaves as `always`.

## Open questions

- The close design, settled by the implementer's finding (a decision added to this plan).
- When to delete the deprecated settings from the manifest (a later release).
