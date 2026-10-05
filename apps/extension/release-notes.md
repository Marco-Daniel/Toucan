Toucan 1.1.0 moves the optional sidebar block into the Explorer, where it no longer needs a bar of its own.

## What's new

- **The sidebar block lives in the Explorer.** It used to sit in the secondary sidebar; now it's a section of the Explorer, below the folder tree. In a workspace where the block was already on, it first shows as a collapsed **Toucan** header at the bottom: open it once and VS Code remembers. When you turn `toucan.sidebarBlock.enabled` on while the window runs, Toucan opens it for you, once, in the window you're working in (switching the sidebar to the Explorer if it showed Search or Source Control). Otherwise Toucan never switches the sidebar's view and never re-opens a block you collapsed. You can drag the block anywhere, to the top of the Explorer say, and VS Code remembers the place. ([#37](https://github.com/Marco-Daniel/Toucan/pull/37))
- **Hiding is simple.** **Hide** from the block's `…` menu, or **Toucan: Toggle Sidebar Block**, hides it, and it stays hidden in this workspace until you run Toggle Sidebar Block again, which also opens a block that is merely collapsed. Collapsing it, showing another view or hiding the sidebar never hides it for good. ([#37](https://github.com/Marco-Daniel/Toucan/pull/37))
- **The `unfocused` mode is gone.** `toucan.sidebarBlock.visibility` and a repository's `sidebarBlock` field are deprecated and ignored; the block is shown while it's on, until you hide it. A leftover value does nothing, and the settings will be removed in a later release. ([#37](https://github.com/Marco-Daniel/Toucan/pull/37))

### After updating

If the secondary sidebar was showing the block when you updated, it may stay open and empty once: close it with the bar's **×**. If you had closed the old block before, it shows again in the Explorer: hide it once with **Hide** if you don't want it.

### Behind the scenes

For contributors; the extension works the same.

- **ADR-0016:** Toucan targets VS Code only; other editors may install the VSIX from the GitHub releases, with best-effort support. ([#35](https://github.com/Marco-Daniel/Toucan/pull/35))
- **The website** links Toucan on the Marketplace and shows the 1.0.0 changelog. ([#34](https://github.com/Marco-Daniel/Toucan/pull/34), [#36](https://github.com/Marco-Daniel/Toucan/pull/36))

The version bump is [#38](https://github.com/Marco-Daniel/Toucan/pull/38).

## Install

From the Marketplace: in VS Code, open the Extensions view and search for **Toucan**, or run `code --install-extension marco-daniel.toucan`.

Or download `toucan-1.1.0.vsix` below, then either:

- in VS Code: Extensions view → `…` → **Install from VSIX…**, or
- from a terminal: `code --install-extension toucan-1.1.0.vsix`

Installing over 1.0.0 keeps your settings.

SHA-256: `{{sha256}}`

To check the download was built by this repository's release workflow:

```sh
gh attestation verify toucan-1.1.0.vsix --repo Marco-Daniel/Toucan
```

## Good to know

- Toucan is a VS Code extension; Cursor, VSCodium and Windsurf aren't supported (see ADR-0016 in the repository), though their users may install the VSIX above where their VS Code base is recent enough.
- [v1.0.0](https://github.com/Marco-Daniel/Toucan/releases/tag/v1.0.0) and earlier are still available.

The full review history of each change is in its PR.

🤖 MarcoGPT
