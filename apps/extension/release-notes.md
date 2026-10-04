Toucan 1.0.0 is on the Visual Studio Marketplace. It works as 0.0.4 did; from now on, every release reaches the Marketplace as exactly the file attached here.

## What's new

- **On the Marketplace.** Install Toucan from the Extensions view: search for **Toucan**. Updates now arrive like any other extension's. The store page has the full feature tour and this changelog. ([#31](https://github.com/Marco-Daniel/Toucan/pull/31))
- **The preset contrast warning sits on the preset's own line.** In Pick Preset Color, a preset that's hard to see on the status bar now says so after its hex, instead of in a second row: every preset is one row. ([#15](https://github.com/Marco-Daniel/Toucan/pull/15))
- **Every feature, shown.** The README walks through each feature with screenshots taken from the real extension. ([#14](https://github.com/Marco-Daniel/Toucan/pull/14))
- **A website.** [toucan-vscode.netlify.app](https://toucan-vscode.netlify.app) has the tour, the docs and the changelog. ([#21](https://github.com/Marco-Daniel/Toucan/pull/21))

### Behind the scenes

- **Releases are built and signed by GitHub Actions.** Each release's VSIX comes with a build attestation, and the Marketplace gets that same file, verified first. ([#31](https://github.com/Marco-Daniel/Toucan/pull/31), [#32](https://github.com/Marco-Daniel/Toucan/pull/32))
- **A security policy** says how to report a vulnerability privately. ([#17](https://github.com/Marco-Daniel/Toucan/pull/17))

The version bump is [#33](https://github.com/Marco-Daniel/Toucan/pull/33).

## Install

From the Marketplace: in VS Code, open the Extensions view and search for **Toucan**, or run `code --install-extension marco-daniel.toucan`.

Or download `toucan-1.0.0.vsix` below, then either:

- in VS Code: Extensions view → `…` → **Install from VSIX…**, or
- from a terminal: `code --install-extension toucan-1.0.0.vsix`

Installing over 0.0.4 keeps your settings.

SHA-256: `{{sha256}}`

To check the download was built by this repository's release workflow:

```sh
gh attestation verify toucan-1.0.0.vsix --repo Marco-Daniel/Toucan
```

## Good to know

- Open VSX (for Cursor, VSCodium and Windsurf) comes next.
- [v0.0.4](https://github.com/Marco-Daniel/Toucan/releases/tag/v0.0.4) and earlier are still available.

The full review history of each change is in its PR.

🤖 MarcoGPT
