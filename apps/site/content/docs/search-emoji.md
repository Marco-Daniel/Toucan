![A colored emoji in front of the title in the search bar](search-emoji.png)

Turn on [`toucan.experimental.searchEmoji`](/docs/settings#toucanexperimentalsearchemoji) for a colored emoji in the Command Center label, in every window, focused or not. It relies on internal VS Code behavior that may break in any release.

- **Consent.** It needs two variables of its own, `${toucanRepoLead}` and `${toucanRepoEmoji}`, in your `window.title`, so Toucan asks once before changing that setting in your user settings. Declining turns the emoji off again. A workspace that sets its own `window.title` won't show the emoji.
- **The look.** The emoji leads the label while a file is open ("🟦 file.ts — webshop") and sits in front of the folder name when none is ("🟦 webshop"). It's the nearest of nine colored squares to the repository color; the circle glyph gets circles and the heart glyph gets hearts.
- **Restore.** Turning the emoji off restores your previous `window.title`, unless you've edited it since.
- **Uninstall.** If Toucan is disabled or uninstalled with the emoji still on, the two variables stay empty: the title shows no emoji and no repeated name.
