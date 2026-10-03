![The sidebar block in the secondary sidebar: the repository's glyph and name on its color](sidebar-block.png)

An opt-in block in the secondary sidebar shows the repository's glyph large, with its name underneath, in the repository color. Turn it on with [`toucan.sidebarBlock.enabled`](/docs/settings#toucansidebarblockenabled) or **Toucan: Toggle Sidebar Block**.

## Style

![The sidebar block in muted style: a faint tint, the glyph in the repository color and the name in the theme's text color](sidebar-muted.png)

[`toucan.sidebarBlock.style`](/docs/settings#toucansidebarblockstyle) sets how strongly it's colored: `full` (default) is the solid repository color; `muted` is a faint tint with the glyph in full color and the name in the theme's text color.

## When it shows

[`toucan.sidebarBlock.visibility`](/docs/settings#toucansidebarblockvisibility) sets when it's shown, and a repository's own `sidebarBlock` in `toucan.repos` overrides it:

- `always` (default) reveals the block on startup. Once you close it, or switch the secondary sidebar to another view, it stays closed in this workspace until you open it again with Toggle Sidebar Block.
- `unfocused` reveals it when the window loses focus, and closes the secondary sidebar again on focus if Toucan opened it. If another view such as Chat was open in the secondary sidebar, it is closed too.

When the block goes off (its repository loses its color, or you turn the setting off), Toucan closes the secondary sidebar only if it opened it itself. A secondary sidebar you opened stays open.
