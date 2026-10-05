# 0008. Reveal the block once, when the user turns it on

- Status: Accepted
- Date: 2026-10-05
- Deciders: Marco
- Supersedes: the "never reveals by itself" and `"visibility": "visible"` parts of [0007](0007-let-the-manifest-open-the-block-and-use-a-new-key.md); the new key stands

## Context and Problem

0007 dropped Toucan's own reveal and declared the view `"visibility": "visible"` so it would show expanded. The isolated VS Code test of that build (a fresh profile with the setting on; the setting turned on mid-session with Search open; Search open at launch; an upgrade with an old close flag) showed:

- **No view switching:** with Search open and the setting turned on, the primary sidebar stayed on Search.
- **But the block is collapsed:** in every case it sits as the last Explorer section with only a "Toucan" header. VS Code starts every extension view in the Explorer collapsed and ignores `visibility`, so the field did nothing and is removed.

So a user who turns the block on sees a collapsed header at the bottom, not the color.

## Considered Options

- **(a)** Accept the collapsed start and say so in the docs
- **(b)** Reveal with `.focus` once, when the user turns the block on during the session, by any route (Toggle's Turn On, the Settings UI, settings.json); never on startup, never when a repo gets a color, never on a reload where the setting was already on
- **(c)** Reveal only when the Explorer is already the primary view: there is no stable API for the active primary view

## Decision Outcome

Chosen: **(b)**, with (a) as the rule for everything else.

- The setting going from off to on while the window runs (a configuration change) runs `.focus` with `preserveFocus` once. That is the user's own action, so one switch to the Explorer is expected, and the block shows expanded.
- Not on startup, not when a repo gets its color, not on a reload with the setting already on, and not for a block remembered as hidden (it stays hidden until Toggle).
- Toggle Sidebar Block (show) keeps its `.focus`.
- The manifest no longer declares `visibility`.
- A new workspace shows a collapsed "Toucan" header at the bottom; opening it once is remembered by VS Code.

## Consequences

- Good: turning the block on shows it at once; nothing else ever switches the primary sidebar's view.
- Bad: a block that is already on in a workspace the user opens for the first time (an upgrade included) shows as a collapsed header until opened; the docs say so.
