All of Toucan's settings apply from user settings only, never from a repository's `.vscode/settings.json`, and they are shared across all VS Code profiles.

## toucan.repos

Default: `{}`

Colors per repository, keyed by workspace folder name: the directory name, or the `name` a `.code-workspace` file gives the folder. In a multi-root window, the first folder is used. The [commands](/docs/commands) write this setting for you; you can also edit it by hand.

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

A value is either a color string, the Command Center background with everything else derived, or an object:

- `background` (required): the Command Center background.
- `foreground`, `activeBackground`, `activeForeground`, `border`, `activeBorder`, `inactiveForeground`, `inactiveBorder` (optional): override the Command Center's derived `commandCenter.*` colors.
- `glyph` (optional): the status bar [glyph](/docs/glyphs), default `square`.
- `sidebarBlock` (optional): `always` or `unfocused`, overriding `toucan.sidebarBlock.visibility` for this repository.

## toucan.sidebarBlock.enabled

Default: `false`

Shows the [sidebar block](/docs/sidebar) in the secondary sidebar, for repositories with a color. Off by default.

## toucan.sidebarBlock.style

Default: `"full"`

How strongly the sidebar block is colored: `full` (default) or `muted`.

## toucan.sidebarBlock.visibility

Default: `"always"`

When the sidebar block is shown: `always` (default) or `unfocused`. A repository's own `sidebarBlock` in `toucan.repos` overrides it.

## toucan.experimental.searchEmoji

Default: `false`

Shows the [search emoji](/docs/search-emoji) in the Command Center label. Off by default. Toucan asks before it changes `window.title`.
