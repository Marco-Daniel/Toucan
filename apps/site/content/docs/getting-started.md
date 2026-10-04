Toucan shows at a glance which repository a VS Code window has open. Colors are configured once, by repository name, in your own user settings, and Toucan never writes anything into the opened repository.

![Three VS Code windows, each shown as its title bar and status bar: as focus moves, the Command Center takes the focused repository's color while each status bar keeps its own; then Set Color previews a new color and saves it](hero.gif)

- The [Command Center](/docs/colors) takes the focused window's repository color.
- Every window, focused or not, shows a [glyph](/docs/glyphs) and the repository name in that color on the status bar.
- Opt-in extras: a [sidebar block](/docs/sidebar), and an experimental [search emoji](/docs/search-emoji).
- One [setting](/docs/settings) for every repository you open, set through [commands](/docs/commands) with a live preview, or by hand.

## Install

Install Toucan from the [Visual Studio Marketplace](https://marketplace.visualstudio.com/items?itemName=marco-daniel.toucan): in VS Code, open the Extensions view and search for **Toucan**, or run `code --install-extension marco-daniel.toucan`.

It isn't on Open VSX (Cursor, VSCodium, Windsurf) yet. There, download the `.vsix` from the latest [GitHub release](https://github.com/Marco-Daniel/Toucan/releases/latest), then either:

- in VS Code: Extensions view → `…` → **Install from VSIX…**, or
- from a terminal: `code --install-extension toucan-<version>.vsix`

## Your first color

1. Open a repository in VS Code.
2. Run **Toucan: Set Color for This Repo** from the Command Palette, or **Toucan: Pick Preset Color** for one of the [presets](/docs/presets).
3. Watch the status bar preview the color as you type or move through the list, then press Enter to save it.

The Command Center and the status bar take the color at once. Every window that opens this repository gets it too.
