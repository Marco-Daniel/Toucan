/**
 * Toucan's own window title variables (toucan-v1/0007), registered per window
 * and backed by Toucan's context keys: one in front of the title, one in front
 * of the folder name. Nobody else sets them, and a variable nobody registers
 * renders empty, so a title Toucan leaves behind (after an uninstall, or with
 * Toucan disabled) shows no emoji and no repeated name.
 */
export const LEAD_VARIABLE_NAME = "toucanRepoLead";
export const EMOJI_VARIABLE_NAME = "toucanRepoEmoji";
export const LEAD_VARIABLE = `\${${LEAD_VARIABLE_NAME}}`;
export const EMOJI_VARIABLE = `\${${EMOJI_VARIABLE_NAME}}`;
/** What earlier versions put in front of the title, for upgrading and restoring theirs. */
const LEGACY_LEAD = "${activeRepositoryName}";
const ROOT_NAME = "${rootName}";

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

/**
 * The title with the emoji slot directly in front of the first `${rootName}`,
 * where the emoji goes while no editor is open. Unchanged when the slot is
 * already there or the title has no `${rootName}`.
 */
export function withEmojiSlot(title: string): string {
  return title.includes(EMOJI_VARIABLE) || !title.includes(ROOT_NAME)
    ? title
    : title.replace(ROOT_NAME, `${EMOJI_VARIABLE}${ROOT_NAME}`);
}

/**
 * The title Toucan needs: the current one (or VS Code's default) with its
 * lead variable in front, so the Command Center label starts with it, and the
 * emoji slot in front of the folder name (see `withEmojiSlot`). No space or
 * separator next to either: the values carry their own trailing space (see
 * `titleValues`), so an empty one leaves no stray space and lets VS Code drop
 * the separator beside it. `undefined` when the lead variable is already there.
 */
export function titleWithEmoji(current: string): string | undefined {
  return current.includes(LEAD_VARIABLE) ? undefined : `${LEAD_VARIABLE}${withEmojiSlot(current)}`;
}

/**
 * A title Toucan wrote, in today's form: an earlier version's
 * `${activeRepositoryName}` in front becomes the lead variable, and the emoji
 * slot is added. Today's form, or any other title, comes back unchanged.
 */
export function currentForm(written: string): string {
  return written.startsWith(LEGACY_LEAD)
    ? `${LEAD_VARIABLE}${withEmojiSlot(written.slice(LEGACY_LEAD.length))}`
    : withEmojiSlot(written);
}

/**
 * Every form of a title Toucan wrote that may still be in the settings: as
 * recorded, with only the slot added (an earlier build of this change), and
 * in today's form (an upgrade whose record didn't get written).
 */
export function writtenForms(written: string): string[] {
  return [...new Set([written, withEmojiSlot(written), currentForm(written)])];
}

interface TitleValuesArgs {
  repo: { emoji: string } | undefined;
  /** Whether the window has an active editor, so `${activeEditorShort}` isn't empty. */
  hasEditor: boolean;
  /** Whether the title has the emoji slot in front of the folder name. */
  hasSlot: boolean;
}

/** What the lead variable and the emoji slot show. */
export interface TitleValues {
  lead: string;
  beforeRoot: string;
}

/**
 * What the two variables show: the emoji and a space in exactly one of them,
 * the other empty. In front while an editor is open ("🟦 file.ts — webshop");
 * in front of the folder name while none is, so VS Code drops the separator
 * that would otherwise trail the emoji ("🟦 webshop"). A title without the
 * slot keeps the emoji in front. Both empty for a repo without a color.
 */
export function titleValues({ repo, hasEditor, hasSlot }: TitleValuesArgs): TitleValues {
  if (!repo) {
    return { lead: "", beforeRoot: "" };
  }
  const emoji = `${repo.emoji} `;
  return !hasEditor && hasSlot ? { lead: "", beforeRoot: emoji } : { lead: emoji, beforeRoot: "" };
}

interface TitleToRestoreArgs {
  change: TitleChange;
  current: string | undefined;
}

/**
 * The value to restore when the search emoji is turned off: the previous one,
 * but only if `window.title` is still a form of what Toucan wrote (see
 * `writtenForms`). If the user edited it since, their edit stays.
 */
export function titleToRestore({
  change,
  current,
}: TitleToRestoreArgs): { restore: true; value: string | undefined } | { restore: false } {
  if (
    change.written === undefined ||
    current === undefined ||
    !writtenForms(change.written).includes(current)
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
