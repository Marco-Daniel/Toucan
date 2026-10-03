/** The window title variable the search emoji rides on (toucan-v1/0007). */
export const REPO_VARIABLE = "${activeRepositoryName}";

/** What Toucan changed in `window.title`, so it can be undone (toucan-v1/0015). */
export interface TitleChange {
  /** The user's value before, or `undefined` when it was unset. */
  previous: string | undefined;
  /** The value Toucan wrote, or `undefined` when no change was needed. */
  written: string | undefined;
  /**
   * When Toucan recorded the change, set from just before it writes
   * `window.title` until that write has succeeded (milliseconds since the
   * epoch). Only a crash in between leaves it set.
   */
  pendingSince?: number;
}

/**
 * How old a pending record must be before it counts as a crashed write. A live
 * write takes milliseconds; recovery doesn't need to be instant.
 */
export const PENDING_STALE_MS = 30_000;

/** Toucan's own title variable, registered for the emoji in front of the folder name. */
export const EMOJI_VARIABLE_NAME = "toucanRepoEmoji";
export const EMOJI_VARIABLE = `\${${EMOJI_VARIABLE_NAME}}`;
const ROOT_NAME = "${rootName}";

/**
 * The title with Toucan's emoji slot directly in front of the first
 * `${rootName}`, where the emoji goes while no editor is open (toucan-v1/0007).
 * Unchanged when the slot is already there or the title has no `${rootName}`.
 */
export function withEmojiSlot(title: string): string {
  return title.includes(EMOJI_VARIABLE) || !title.includes(ROOT_NAME)
    ? title
    : title.replace(ROOT_NAME, `${EMOJI_VARIABLE}${ROOT_NAME}`);
}

/**
 * The title Toucan needs: the current one (or VS Code's default) with the
 * repository variable in front, so the Command Center label starts with it,
 * and the emoji slot in front of the folder name (see `withEmojiSlot`).
 * No space or separator next to either: the values carry their own trailing
 * space (see `titleValues`), so an empty one leaves no stray space and lets
 * VS Code drop the separator beside it. `undefined` when the repository
 * variable is already there: the user's own title, which Toucan leaves as is.
 */
export function titleWithRepoVariable(current: string): string | undefined {
  return current.includes(REPO_VARIABLE) ? undefined : withEmojiSlot(`${REPO_VARIABLE}${current}`);
}

interface TitleValuesArgs {
  change: TitleChange;
  repo: { name: string; emoji: string } | undefined;
  /** Whether the window has an active editor, so `${activeEditorShort}` isn't empty. */
  hasEditor: boolean;
}

/** What the repository variable (`lead`) and Toucan's emoji slot (`beforeRoot`) show. */
export interface TitleValues {
  lead: string;
  beforeRoot: string;
}

/**
 * What the two variables show. When Toucan added them, the title already
 * names the repo, so the emoji and a space go in one of them and the other
 * stays empty: in front while an editor is open ("🟦 file.ts — webshop"),
 * in front of the folder name while none is, so VS Code drops the separator
 * that would otherwise trail the emoji ("🟦 webshop"). A title Toucan wrote
 * before the slot existed keeps the emoji in front. Both are empty for a repo
 * without a color. When the user's own title used the repository variable, it
 * stands in for SCM's repo name, so the emoji plus the name; `undefined`
 * without a color, so SCM's own value comes back.
 */
export function titleValues({ change, repo, hasEditor }: TitleValuesArgs): TitleValues | undefined {
  if (change.written === undefined) {
    return repo && { lead: `${repo.emoji} ${repo.name}`, beforeRoot: "" };
  }
  if (!repo) {
    return { lead: "", beforeRoot: "" };
  }
  const emoji = `${repo.emoji} `;
  return !hasEditor && change.written.includes(EMOJI_VARIABLE)
    ? { lead: "", beforeRoot: emoji }
    : { lead: emoji, beforeRoot: "" };
}

interface TitleToRestoreArgs {
  change: TitleChange;
  current: string | undefined;
}

/**
 * The value to restore when the search emoji is turned off: the previous one,
 * but only if `window.title` is still what Toucan wrote. If the user edited
 * it since, their edit stays.
 */
export function titleToRestore({
  change,
  current,
}: TitleToRestoreArgs): { restore: true; value: string | undefined } | { restore: false } {
  // A title Toucan upgraded with the emoji slot but crashed before recording still counts.
  if (
    change.written === undefined ||
    (current !== change.written && current !== withEmojiSlot(change.written))
  ) {
    return { restore: false };
  }
  return { restore: true, value: change.previous };
}

interface SearchEmojiStepArgs {
  enabled: boolean;
  focused: boolean;
  change: TitleChange | undefined;
}

/**
 * The global step a window takes for the search emoji (toucan-v1/0015): ask for consent
 * when the feature is on but nothing is recorded yet, restore when it's off
 * but a change is recorded. Only the focused window does either, so several
 * open windows don't all ask.
 */
export function searchEmojiStep(state: SearchEmojiStepArgs): "ask" | "restore" | "none" {
  if (!state.focused) {
    return "none";
  }
  if (state.enabled && state.change === undefined) {
    return "ask";
  }
  if (!state.enabled && state.change !== undefined) {
    return "restore";
  }
  return "none";
}

interface ShouldLabelArgs {
  enabled: boolean;
  change: TitleChange | undefined;
}

/** Whether a window shows the emoji label (otherwise it hands the key back). */
export function shouldLabel({ enabled, change }: ShouldLabelArgs): boolean {
  return enabled && change !== undefined;
}

interface UnappliedChangeArgs {
  change: TitleChange;
  currentTitle: string | undefined;
  now: number;
}

/**
 * Whether a recorded change was never applied: Toucan records it (pending)
 * before writing `window.title`, so if the window died in between, the record
 * stays pending and the title is still the previous one. Dropping it lets the
 * next step ask again. A settled record is never dropped (another window's
 * view of the title can lag behind the write), and neither is a recent
 * pending one (its write may still be under way in another window).
 */
export function unappliedChange({ change, currentTitle, now }: UnappliedChangeArgs): boolean {
  return (
    change.pendingSince !== undefined &&
    now - change.pendingSince > PENDING_STALE_MS &&
    change.written !== undefined &&
    currentTitle === change.previous
  );
}
