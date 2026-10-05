# Context: The sidebar block lives in the Explorer

## What exists (main at 9b0506d, v1.0.0)

- **Manifest** (`apps/extension/package.json`): `viewsContainers.secondarySidebar` holds the `toucan` container (icon `$(symbol-color)`); `views.toucan` holds the webview view `toucan.block`, shown when the context key `toucan.sidebarBlockAvailable` is set. Settings: `toucan.sidebarBlock.enabled` (default false), `.style` (`full`/`muted`), `.visibility` (`always`/`unfocused`, default `always`), and a per-repo `visibility` override in `toucan.repos`. All application scope.
- **Adapter** (`features/sidebar/sidebar.adapter.ts`): `SidebarBlock` registers the webview provider (scripts off, no resource roots), sets the context key, renders `sidebarBlockHtml`, and gives `SidebarController` its ports: `reveal` (`toucan.block.focus` with `preserveFocus`), `closeBar` (`workbench.action.closeAuxiliaryBar`), `readClosed`/`writeClosed` (workspaceState `sidebarBlock.closed`), `warn`, `debug`. `toggle()` offers to turn the setting on when it's off.
- **Controller** (`features/sidebar/sidebar.util.ts`): `always` reveals on startup unless remembered closed; a close is remembered when the view stops being visible while focused and Toucan didn't cause it, after a delay so reloads don't count. `unfocused` reveals on blur and closes the bar on focus only if Toucan opened it. Settings changes reveal or close accordingly.
- **Decisions this replaces:** toucan-v1/0006 (opt-in secondary sidebar block, never switching other views) and toucan-v1/0013 (style and visibility settings, what counts as a close, Toggle Sidebar Block).
- **ADR-0016:** Toucan is a VS Code extension; Cursor reserves the secondary sidebar.

## Patterns to follow

- Only adapters import `vscode` (ADR-0006); the controller stays plain TypeScript behind ports, unit tested with fakes that can disagree.
- Config keys from the generated `configs` constants (vscode-ext-gen), never string literals.
- Object arguments, error handling through `tryCatch` (ADR-0009), every promise awaited.
- Release notes per ADR-0013; hand upload per marketplace-upload; no release or `v*` tag without Marco's per-release OK.

## Integration points

- VS Code restores a moved view's location by its id; keep `toucan.block`.
- `workbench.action.closeSidebar` would hide the whole primary sidebar: not usable for "close the block".
- The isolated VS Code harness: `apps/extension/scripts/screenshots/` (CDP; unset `ELECTRON_RUN_AS_NODE`, short socket path). Marco's machine must be unlocked and idle for a run.
