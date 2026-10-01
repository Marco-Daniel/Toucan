# 0015. Ask before changing window.title

- Status: Accepted
- Date: 2026-10-01
- Deciders: Marco

## Context and Problem

The experimental search emoji (0007) only works if the global `window.title` contains `${activeRepositoryName}`. That is a change to a user setting Toucan doesn't own, so it needs the user's consent.

## Considered Options

- **Ask when the setting is turned on**
- Change it silently: turning the setting on counts as consent
- A command only, no setting

## Decision Outcome

Chosen: **ask when `toucan.experimental.searchEmoji` is turned on.** Toucan shows a dialog that explains the `window.title` change. Cancel turns the setting back off. Toucan stores the previous `window.title` value and restores it when the setting is turned off.

## Consequences

- Good: no surprise changes to a setting Toucan doesn't own, and turning the feature off leaves things as they were.
- Bad: one extra dialog the first time.
- Follow-ups: what to do if the user edits `window.title` themselves while the feature is on (e.g. don't restore over their edit).
