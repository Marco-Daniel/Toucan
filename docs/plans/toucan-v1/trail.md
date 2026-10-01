# Trail: choices and why

The choices made while shaping Toucan v1, what each was picked over, and the reason. The full decision records are in [decisions/](decisions/); this file is the short version. Where no reason was given beyond picking the recommended option, it says so.

## Starting point

- **What Toucan is for:** show which repo a VS Code window has open, like Peacock and Kingfisher, by coloring the Command Center (the search bar in the title bar).
- **Hard requirement:** nothing is written into the repo. VS Code just has to know which color goes with which repo.
- **Wish:** each window keeps its own color, also when it isn't focused.
- **Tooling ambition:** as modern as a VS Code extension can be (oxlint, TS 7 where possible). Marco's earlier extension setups felt outdated.

## Config

| Choice | Over | Why |
|---|---|---|
| Colors in user settings, `toucan.repos`, keyed by workspace folder name | Git remote name, remote with folder fallback | Simple, and a pattern Marco already uses elsewhere. Keeps the repo clean. |
| Value is a color string or an object | Flat maps per property | A plain background covers most cases; the object allows full control. |
| `background` is the only required key, every other key can be set, missing ones are derived | A fixed set of colored parts | Fully controllable, with no effort when you only care about the background. |
| Any color format culori can parse | Hex only | No reason to limit it if culori handles parsing anyway. |
| Missing colors derived with culori (contrast for foreground, OKLCH lightness for hover/border, alpha for inactive) | Hand-rolled color math | One library for both parsing and deriving. The amounts get tuned once we see it in the real title bar. |
| Repo without a color: Toucan removes its keys | Automatic hash color | You only see a color for repos you chose to color. |
| Colors set by hand in settings.json, or with Set Color, Preset Picker and Clear Color commands | Only one of those | Wanted all of them. |

## Which keys Toucan owns

- **Toucan owns all `commandCenter.*` keys** in `workbench.colorCustomizations` and leaves every other key alone.
- **Why:** those keys only style the search bar from the screenshot, so they are Toucan's to manage.

## Per-window colors

This took the most back and forth.

1. **User settings, applied on focus.** Picked first, but it can't keep a color in an unfocused window: user scope is shared by all windows. Marco asked why the color can't just stay when VS Code loses focus, so this went to a brainstorm.
2. **`.vscode/settings.json` in the repo (Peacock's way).** Rejected: it puts a file in the repo.
3. **A Toucan-managed `.code-workspace` stored outside the repo.** The only supported way to get a real per-window Command Center color. Not chosen: it costs a reload the first time and changes how you open repos. Marco preferred to look at the Kingfisher way instead.
4. **Injecting CSS / patching VS Code.** Marco asked about it. Rejected: VS Code shows a corrupt-install warning, every update wipes the patch, it clashes with macOS code signing, and it rules out the Marketplace. Peacock closed a PR for the same reasons.
5. **More research.** Marco asked for real research and spikes instead of settling. Three spikes ran in isolated VS Code instances: title bar / search bar, status bar, and Kingfisher's webview. They showed:
   - No extension can add anything to the title bar or Command Center, apart from an emoji trick in the search label.
   - A status bar item can take any hex color per window (text and icon only, not the background).
   - A webview block in the secondary sidebar stays colored in unfocused windows.
   - Kingfisher has no protection against windows overwriting each other's settings writes.

**Chosen layers:**

| Layer | Status | Why |
|---|---|---|
| Command Center color in the focused window, user scope, with guards against windows fighting over settings.json | Always on | The strongest signal, and only stable API. The guards fix the bugs Kingfisher has. |
| Status bar glyph plus repo name in the repo color | Always on, every window | Works per window without writing settings. This answers "recognize an unfocused window". |
| Kingfisher-style block in the secondary sidebar | Opt-in | Very visible, but it takes a sidebar slot and Kingfisher users find it hard on the eyes. Unlike Kingfisher, it won't steal focus or switch views. |
| Emoji in the search label | Opt-in, experimental | The only way to get color into the search bar of an unfocused window, but it relies on an internal VS Code key, needs a global `window.title` change and has about 9 colors. |
| Editor gutter / ruler stripe, tree icons | Left out of v1 | Not needed now. |

- **Own icon font for the status bar glyph** over built-in codicons. VS Code's own icons have no filled square, bar or pill. `$(circle-large-filled)` stays as the fallback.

## Open questions settled after the first plan

| Choice | Over | Why |
|---|---|---|
| Glyph shape set per repo, default square, from a curated list ([0012](decisions/0012-make-the-glyph-a-per-repo-setting-defaulting-to-square.md)) | One fixed shape, one global setting | Square looked best in the spike. A different shape per repo is a second cue next to color, which helps when colors look alike. |
| Sidebar block style configurable, `full` or `muted`, default `full` ([0013](decisions/0013-make-the-sidebar-block-style-and-visibility-configurable.md)) | Only full, only muted | Full is the most recognizable; muted is easier on the eyes. Marco wanted both available. |
| Sidebar block visibility `always` (default) or `unfocused` (Kingfisher style), set globally and overridable per repo ([0013](decisions/0013-make-the-sidebar-block-style-and-visibility-configurable.md)) | Only always, only unfocused | Marco wanted the Kingfisher behavior available as a choice, with always visible as the default. |
| In `unfocused` mode, close the sidebar on focus only if Toucan opened it ([0013](decisions/0013-make-the-sidebar-block-style-and-visibility-configurable.md)) | Reveal on blur and never hide, decide after a spike | Recommended option, accepted. Avoids Kingfisher's layout churn while still hiding the block when you're working. |
| Toucan-themed preset palette ([0014](decisions/0014-ship-a-toucan-themed-preset-palette.md)) | Plain color names, both groups | Recommended option, accepted. Fits the name. |
| Preset values: colors taken from published toucan palettes online ([0014](decisions/0014-ship-a-toucan-themed-preset-palette.md)) | Values made up by Claude | Marco asked for an online toucan palette, to settle the colors now instead of tuning later. |
| Presets adjusted and extended to 16: Beak Orange and Bill Lime darker, Canopy Teal lighter, Slate Blue slightly darker; added Berry Red, Blossom Pink, Lilac and Silver ([0014](decisions/0014-ship-a-toucan-themed-preset-palette.md)) | The 12 source colors as-is | After seeing them side by side, some neighbours were too close and the range missed a dark red, a light pink, a grey/silver and a lilac. Changes stay derived from the source colors to keep the theme. |
| Ask before changing `window.title` for the search emoji; restore it when turned off ([0015](decisions/0015-ask-before-changing-window-title.md)) | Change it silently, a command only | Recommended option, accepted. It's a setting Toucan doesn't own. |
| In `unfocused` mode, accept that Toucan closes the sidebar on focus even if Chat or another view was open there ([0013](decisions/0013-make-the-sidebar-block-style-and-visibility-configurable.md)) | Never close the sidebar on focus | It's an opt-in on top of an opt-in, so accept it for now. The default `always` mode isn't affected. |
| In `always` mode the sidebar block stays closed once you close it, remembered per repo, plus a *Toggle Sidebar Block* command ([0013](decisions/0013-make-the-sidebar-block-style-and-visibility-configurable.md)) | Reopening it on every start | Raised by toucan-2c. Reopening something you closed is annoying; the command makes it easy to bring back. |
| Switching the secondary sidebar to another view such as Chat counts as closing the block ([0013](decisions/0013-make-the-sidebar-block-style-and-visibility-configurable.md)) | Only closing the sidebar counts | Raised by toucan-2c. VS Code restores Chat on restart anyway, so Toucan shouldn't cover it again. |
| Star uses colored squares in the search emoji ([0012](decisions/0012-make-the-glyph-a-per-repo-setting-defaulting-to-square.md)) | Keep ⭐; ⭐ only when the color is yellow (toucan-2c); a custom emoji | Raised by toucan-ab. ⭐ is always yellow, so it loses the color, which is the point of the emoji. A custom emoji isn't possible in plain-text `window.title`. Marco chose to skip the star there. |
| Offer once to switch `chat.agentsControl.enabled` to `badge` when the compact agent pill hides Toucan's background ([0016](decisions/0016-offer-to-switch-agents-control-to-badge.md)) | Document only; accept the border-only look | Found by toucan-ab while testing. Recommended option, accepted: it's the main color layer, and nothing changes without asking. |
| Edit settings.json in place to keep comments, guarded by a file-equals-view check, with `update()` as the fallback ([0017](decisions/0017-edit-settings-in-place-to-keep-comments.md)) | Accept the comment loss and document it | Raised by toucan-2c. Marco doesn't want to lose comments in his settings. The guard keeps the H1 lesson: never edit a file that might not be this window's. |
| 0017 revised: edit only when the key is present and equal, verify and revert within 4 s, write through symlinks like VS Code, `toucan.repos` always in the default profile's file | The first 0017 design (equality check plus temp-then-rename) | toucan-2c found that equality isn't proof of the right file and that rename breaks dotfile symlinks. toucan-ab measured VS Code's own behavior; all three agreed and Marco approved. |
| Warn about low status bar contrast when picking a color ([0018](decisions/0018-warn-about-low-status-bar-contrast-when-picking.md)) | Adjust the glyph color automatically; accept it | Raised by the blind review with measured contrast. Marco wants the color to stay exactly what he picked, with a warning to decide on. |
| Lock in the opt-in setting names from the plan | Leave them to the implementer | Recommended option, accepted. One less thing to guess. |

## Left for later

- **Coloring all status bar text (and maybe its background)** in the focused window. Possible with `statusBar.*` keys and the same focus guards, but only in the focused window. Marco chose to keep v1 as it is and maybe add it later as an opt-in.

## Multi-root

- **First folder in the window** for v1.
- **Why:** Marco asked to try finding a better option in the brainstorm first, with the first folder as the fallback. Nothing better turned up for v1. Following the active editor and color transitions are for later.

## Tooling

| Choice | Over | Why |
|---|---|---|
| pnpm 12 via corepack | npm, bun | Recommended option, accepted. |
| TypeScript 7, typecheck only | TS 5 with tsc builds | Wanted TS 7. A bundler builds the code. |
| tsdown, CJS bundle with `vscode` external | esbuild, tsc | Recommended option, accepted. |
| oxlint and oxfmt | ESLint, Prettier, Biome | Asked for oxlint over ESLint from the start. |
| Vitest 5, unit tests only, logic in modules that don't import `vscode` | @vscode/test-cli integration tests | Recommended option, accepted. Keeps the logic testable without VS Code. |
| vscode-ext-gen for typed config and command ids | String literals | Picked as one of the extra modern goodies. |
| Plain VS Code API | reactive-vscode | Recommended option, accepted. |
| VS Code `^1.138`, Node 24 | Older targets | Recommended option, accepted. |

## Repo, distribution and CI

- **Public GitHub repo `Marco-Daniel/Toucan`, MIT, extension id `marco-daniel.toucan`.** The plan first said private; the repo turned out to be public, and Marco chose to keep it that way.
- **Local VSIX install for now.** Marco does want it on the Marketplace at some point, which is one more reason to stay on stable API.
- **CI on every push:** lint, format check, typecheck, test.
- **Packaging the VSIX is its own manually triggered workflow,** not an artifact on every push. That was Marco's call.
- **No Settings Sync handling.** Marco doesn't use Settings Sync.

## Grounding

- Plans in `docs/plans`, flat, no namespaces.
- Quality checks recorded as separate commands.
- Three conventions: pure logic outside `vscode`, stable API only by default, typed ids via vscode-ext-gen.
