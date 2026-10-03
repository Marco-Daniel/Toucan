# Context: README showcase

- **The README** lists the commands and settings in text, with a generated `<!-- configs -->` table from vscode-ext-gen. The extension icon is `media/icon.png`.
- **Earlier smoke tests** (v0.0.3, PR #12) drove an isolated VS Code over Chrome DevTools: their own user-data-dir and extensions-dir, `window.dialogStyle: custom` so modals render, and input sent to that window only. That's the proven way to drive it.
- **`.vscodeignore` is an allowlist,** and `check:vsix` asserts the 8 packaged files, so README images never ship in the VSIX.
- **The public-repo rule** (CLAUDE.md) applies to images too.
- **The docs-sync rule and `/docs-sync`** keep the README in step with the code.
