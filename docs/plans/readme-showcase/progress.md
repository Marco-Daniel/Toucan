# Progress: README showcase

<!-- Living log. Implementers append newest entries at the top. The planner
     leaves this body empty. Each entry: date, who/what, what changed, what's
     next or blocked. -->

## 2026-10-03: the implementer and the junior

- **Done.** `pnpm screenshots` (scripts/screenshots/): packages the VSIX, installs it into a throwaway VS Code in a temp folder, opens three invented demo repositories (webshop, payments-api, docs-site), drives the windows over the DevTools protocol and captures only their pages. It writes the hero GIF and nine stills to `media/readme/` in about 20 seconds. The README is rebuilt around them: one section per feature, command and setting.
- **Learned.** The Command Center color is a user setting, so every window's Command Center shows the focused window's color (dimmed when unfocused); each window's own color is on its status bar. The README and the hero say so. User settings open in a modal whose header shows the profile's path, so there is no settings screenshot; the `toucan.repos` code block covers it.
- **Choices.** gifenc with pngjs for the GIF (pinned, no install scripts, no ffmpeg needed). PNGs are re-encoded with only IHDR, IDAT and IEND; the GIF has no comment extensions. The script waits on VS Code's state, never fixed sleeps, stops after five minutes, and kills VS Code's process group.
- **Next.** Review rounds. The script is macOS only; another platform needs the app's paths.
