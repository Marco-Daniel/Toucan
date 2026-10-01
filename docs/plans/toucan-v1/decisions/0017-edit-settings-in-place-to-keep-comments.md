# 0017. Edit settings in place to keep comments

- Status: Accepted
- Date: 2026-10-01
- Deciders: Marco

## Context and Problem

Toucan writes two settings: `workbench.colorCustomizations` (0002, 0003) and `toucan.repos` (the commands). VS Code's `WorkspaceConfiguration.update()` replaces the whole value, so any comments inside those two objects are lost on the first write. toucan-2c reproduced it, and the README's own example has comments.

Editing the file directly brings back the problem from the focus coordinator review (H1): the path to the user settings file is guessed from `globalStorageUri`, and with profiles that guess can point at another profile's file.

## Considered Options

- **Edit the exact keys in the settings file with jsonc-parser, guarded, and fall back to `update()`**
- Accept the comment loss and document it
- Always edit the file directly

## Decision Outcome

Chosen: **edit in place when it's provably safe, otherwise fall back to `update()`.** Revised the same day after two high findings from toucan-2c (agreed by all three reviewers, approved by Marco): an equality check alone doesn't prove the file is this window's, and temp-then-rename breaks symlinked settings files.

**Which file**
- `workbench.colorCustomizations`: the user settings file guessed from `globalStorageUri` (as in the focus coordinator).
- `toucan.repos`: application-scoped, so VS Code always stores it in the default profile's `User/settings.json`. Toucan targets that file for it in every profile.

**For each write**
1. A pure planner gets the file text, the parsed file value, the view value (`inspect(key).globalValue`) and the desired value. It returns either minimal jsonc-parser `modify()` edits (per changed `commandCenter.*` key, per changed `toucan.repos` entry, keeping indentation and EOL) or "fall back to `update()`".
2. **Edit in place only when the key is present in the file and deep-equals the view.** When the key is absent there are no comments to keep, so `update()` loses nothing. Equality is not proof of identity (a profile copied from the default has identical values), so step 5 is what makes the guard safe.
3. Fall back while the settings file is open with unsaved changes in this window (compared by realpath, so a symlinked file open under its target path is caught).
4. **Write the way VS Code does:**
   - Symlink: write the target in place through the link.
   - Regular file with one link: temp file next to it, then rename, keeping the file mode.
   - Hard-linked file (nlink > 1): write in place, which keeps the link (VS Code's own `update()` breaks it).
   - Right before writing, re-read the file. If the text changed since planning, plan once more; if it changes again, fall back.
5. **Verify and revert:** wait up to 4 seconds for `inspect(key).globalValue` to reflect the edit (measured: 0.3–1.9 s). If it doesn't and the file still holds exactly Toucan's text, restore the previous text and use `update()`. If the file changed in the meantime, leave it alone and use `update()`. The wrong-file case is logged at debug level. The focus coordinator's verify step stays as the last safety net.

## Consequences

- Good: comments survive in the normal case, and the guard means a wrong file is never edited.
- Bad: more moving parts than `update()`. In the fallback cases (profiles with unusual layouts, a stale view, a dirty settings editor) comments are still lost, so the README says so.
- Risk: a wrong-profile edit can sit in the other profile's file for up to 4 seconds, and a crash in that window leaves it there. Only Toucan's own keys are touched, and the next focus in that profile fixes `commandCenter.*`.
- Risk: Toucan and VS Code writing at the same moment. Re-reading right before the write narrows it to the gap between read and rename, and verify-and-revert catches the rest.
