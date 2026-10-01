# Toucan

See at a glance which repository a VS Code window has open, in the spirit of Peacock and Kingfisher. Colors are configured once, by repository name, in your own user settings. Toucan never writes anything into the opened repository.

> Status: in development. Not on the Marketplace yet; install it from a local VSIX.

## How it works

VS Code has no per-window color API, so Toucan layers a few signals:

- **Command Center color** in the focused window, written to your user-level `workbench.colorCustomizations` on focus and cleared again on blur.
- **Status bar indicator** in every window: a glyph and the repository name in the repository color. It stays visible when the window isn't focused.
- **Sidebar block** (opt-in): a block in the repository color in the secondary sidebar.
- **Search emoji** (opt-in, experimental): a colored emoji in the Command Center label.

Toucan owns every top-level `commandCenter.*` key in your user-level `workbench.colorCustomizations` and never touches other keys. Any `commandCenter.*` colors you had there before installing Toucan are replaced the first time it applies a color, and removed for good when it clears one, so copy them somewhere first if you want to keep them.

In VS Code 1.139, the experimental setting `chat.agentsControl.enabled` defaults to `"compact"`, which replaces the Command Center with an agent status box that has no background. Toucan can then only color its border and text. Set it to `"badge"` (keeps the agent badge) or `"hidden"` for the full color. Toucan offers to switch it to `"badge"` once, and never changes it without asking. If you choose _Not now_, it doesn't ask again in that profile.

The experimental search emoji adds `${activeRepositoryName}` to your `window.title` (after asking) and restores it when you turn the emoji off. Turn it off before uninstalling Toucan, because an uninstall can't restore the title.

Toucan edits `toucan.repos` and its `commandCenter.*` keys in place, so comments in your settings file survive. In a few cases it falls back to VS Code's own settings write, which drops comments inside that setting: when the setting isn't in the file yet, while your settings file has unsaved changes, with an unusual profile layout, or when you switch windows in the second before VS Code has picked up the previous window's change.

Theme-scoped blocks such as `"[Default Dark Modern]": { "commandCenter.background": … }` are yours and Toucan leaves them alone. VS Code applies them on top of the top-level keys, so while that theme is active they override Toucan's Command Center colors.

## Configuration

```jsonc
// user settings.json
"toucan.repos": {
  "webshop": "#e91e63",          // a color string sets the background, the rest is derived
  "toucan": {
    "background": "#1b5e20",   // required
    "foreground": "#ffffff",   // optional overrides
    "glyph": "heart",          // optional, default "square"
    "sidebarBlock": "unfocused"
  }
}
```

Keys are workspace folder names: the directory name, or the `name` a `.code-workspace` file gives the folder. In a multi-root window, the first folder is used. Repositories without an entry get no colors.

Toucan's settings only apply from user settings, never from a repository's `.vscode/settings.json`, and they are shared across all VS Code profiles.

With profiles that share settings but keep separate global state, windows in different profiles don't know about each other. Switching between them can briefly clear the Command Center color before the focused window applies it again.

<!-- configs -->

| Key                               | Description                                                                                                                                                                                                           | Type      | Default    |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | ---------- |
| `toucan.repos`                    | Colors per repository, keyed by workspace folder name. A value is either a color string (the Command Center background; everything else is derived) or an object with a required `background` and optional overrides. | `object`  | `{}`       |
| `toucan.sidebarBlock.enabled`     | Show a block in the repository color in the secondary sidebar.                                                                                                                                                        | `boolean` | `false`    |
| `toucan.sidebarBlock.style`       | How strongly the sidebar block is colored.                                                                                                                                                                            | `string`  | `"full"`   |
| `toucan.sidebarBlock.visibility`  | When the sidebar block is shown. Each repository can override this in `toucan.repos`.                                                                                                                                 | `string`  | `"always"` |
| `toucan.experimental.searchEmoji` | **Experimental.** Show a colored emoji in the Command Center label. Changes `window.title` (Toucan asks first) and relies on internal VS Code behavior that may break in any release.                                 | `boolean` | `false`    |

<!-- configs -->

## Install

```sh
corepack pnpm install
corepack pnpm package
code --install-extension toucan-*.vsix
```

## Development

Requires Node 24 (see `.nvmrc`) and pnpm through corepack.

| Command             | What it does                                                                        |
| ------------------- | ----------------------------------------------------------------------------------- |
| `pnpm lint`         | Lint with oxlint                                                                    |
| `pnpm format:check` | Check formatting with oxfmt (`pnpm format` to fix)                                  |
| `pnpm typecheck`    | Typecheck with TypeScript 7                                                         |
| `pnpm test`         | Run the unit tests with vitest                                                      |
| `pnpm build`        | Bundle `dist/extension.js` with tsdown                                              |
| `pnpm gen`          | Regenerate `src/generated/meta.ts` and the settings table above from `package.json` |
| `pnpm package`      | Build and package a VSIX                                                            |

## License

[MIT](LICENSE)

The circle, double-circle, heart, star and check-circle glyph shapes are [Codicons](https://github.com/microsoft/vscode-codicons) by Microsoft, licensed under [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
