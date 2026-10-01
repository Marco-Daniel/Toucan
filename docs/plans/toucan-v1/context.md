# Context: Toucan v1

Grounding gathered on 2026-10-01 from research and three spikes run in isolated VS Code 1.139.1 instances on macOS. Spike code is in [assets/spikes/](assets/spikes/).

## VS Code API facts

- **No per-window color API.** `workbench.colorCustomizations` is window-scoped. User scope is shared by all windows; per-window values only come from workspace settings (`.vscode/settings.json` or a `.code-workspace` file). A request for in-memory configuration updates, [microsoft/vscode#43226](https://github.com/microsoft/vscode/issues/43226), was closed as not planned.
- **Command Center colors**: `commandCenter.background`, `foreground`, `activeBackground`, `activeForeground`, `border`, `activeBorder`, `inactiveForeground`, `inactiveBorder` (also `debuggingBackground`). They only style the search box in the title bar.
- **No contributable title bar menus.** The title bar MenuIds (`CommandCenter`, `CommandCenterCenter`, `TitleBar`, `LayoutControlMenu`, …) have no extension contribution key in `menusExtensionPoint.ts`; unknown menu keys are silently skipped.
- **Status bar** (`@types/vscode` 1.138): `StatusBarItem.color` is `string | ThemeColor`, so any hex works per window and colors codicons and custom font icons too. `backgroundColor` only allows `statusBarItem.errorBackground` / `warningBackground`; other values are dropped. The remote indicator always stays leftmost.
- **Custom icons**: `contributes.icons` with `fontPath` + `fontCharacter` renders arbitrary glyphs, colored by `color`. Built-in codicons have no filled square/bar; `circle-large-filled` is the best solid fallback.
- **Markdown tooltips** (`supportHtml`): `<span style="color:#hex;background-color:#hex;display:inline-block;border-radius:Npx;">` survives the sanitizer only in exactly that property order; `data:image/svg+xml` images render.
- **Window state**: `onDidChangeWindowState` fires for both `focused` and `active` changes. `active` turns false after ~30–60 s of no input, so handlers must compare `focused` with the previous value.
- **Views**: `viewsContainers.secondarySidebar` is supported on stable. `<viewId>.focus` accepts `{ preserveFocus: true }`. Webview width is user-controlled.
- **Window title variables**: when `window.title` is customized, the Command Center label shows the window title. `${activeRepositoryName}` reads the per-window context key `scmActiveRepositoryName`, which `setContext` can overwrite; SCM rewrites it on repo changes.

## Prior art

- **Peacock** writes workspace settings. A PR adding user-level config plus a stylesheet-patching renderer ([johnpapa/vscode-peacock#712](https://github.com/johnpapa/vscode-peacock/pull/712)) was closed for complexity, fragility and restart requirements.
- **Kingfisher** (`appsoftwareltd/vscode-kingfisher` v0.1.8): stores colors in `globalState`, writes four `titleBar.*` keys to user settings on focus, clears on blur, and opens a colored webview view on blur. It has no race protection (blur also fires on `active` changes; whole-object read-modify-write in every window) and open issues about settings save conflicts (#6), the block being hard on the eyes (#2), leftovers after uninstall (#4) and contrast (#3).

## Patterns to follow

- **Config pattern to follow**: a single map in user settings keyed by `workspaceFolder.name`, read with `getConfiguration()`; editing settings.json by hand works as well as using commands.
- The user's `settings.json` already contains a large `workbench.colorCustomizations` block (no `commandCenter.*` keys) and uses JSONC with trailing commas; write through `WorkspaceConfiguration.update(…, ConfigurationTarget.Global)` and merge.

## Tool versions (npm, 2026-10-01)

typescript 7.0.2, oxlint 1.86.0, oxfmt 0.71.0, tsdown 0.23.0, vitest 5.0.3, pnpm 12.8.1, @vscode/vsce 4.0.0, @types/vscode 1.138.0, vscode-ext-gen 1.6.0. Local: Node 24.21.0, VS Code 1.139.1.

## Sidebar ownership spike (for 0013's `unfocused` mode)

Tested in an isolated VS Code instance. Code and event log in [assets/spikes/spike-sidebar-owner/](assets/spikes/spike-sidebar-owner/). The run was cut off before the source check, multi-window and reload tests.

- **Works:** Toucan keeps its own "opened by Toucan" flag and checks `WebviewView.visible` on its own view.
  - Bar closed: reveal on blur, `workbench.action.closeAuxiliaryBar` on focus. Reliable every time.
  - Toucan's view already open: leave it alone. Reliable.
  - `closeAuxiliaryBar` doesn't move focus (tested from the editor and from Explorer) and does nothing when the bar is already closed.
  - Reopening the bar yourself after Toucan closed it works normally.
  - `active`-only window state events are ignored by comparing `focused` with the previous value.
- **Gap:** an extension can only see whether *its own* view is visible. It can't tell "secondary sidebar closed" from "open, showing another view such as Chat". With Chat open, Toucan replaces it on blur and then closes the whole bar on focus, so Chat disappears.
- **Tried and rejected:** a hidden Explorer tree view with `when: auxiliaryBarVisible` as a probe. It only reports while Explorer is the visible left sidebar view (not with Search open or the sidebar closed), so it isn't reliable.

## Spike launch notes

- The host shell inherits `ELECTRON_RUN_AS_NODE=1` (and `VSCODE_IPC_HOOK`); launch `code` with a clean env.
- Long `--user-data-dir` paths exceed the 103-char IPC socket limit (`listen EINVAL`); use a short path in the system temp directory.
- Spike instances keep running after the agent stops; kill them and remove their temp directories.
- `screencapture` of the whole display may lack permission; `screencapture -l <windowId>` or `--remote-debugging-port` + DevTools `Page.captureScreenshot` work.

## Repo

- Remote: `Marco-Daniel/Toucan` on GitHub (public, personal account). Author `Marco-Daniel <m.leguijt@outlook.com>`.
