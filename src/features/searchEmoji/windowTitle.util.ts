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

/**
 * The title Toucan needs: the current one (or VS Code's default) with the
 * repository variable in front, so the Command Center label starts with it.
 * No space or separator in between: the value carries its own trailing space
 * (see `repoVariableValue`), so a repo without a color leaves no stray space
 * or dangling separator. `undefined` when the variable is already there.
 */
export function titleWithRepoVariable(current: string): string | undefined {
  return current.includes(REPO_VARIABLE) ? undefined : `${REPO_VARIABLE}${current}`;
}

/**
 * What the variable shows. When Toucan added it, the title already names the
 * repo elsewhere, so the emoji and a space (nothing for a repo without a
 * color, so VS Code drops the separator after it). When the user's own title
 * used it, it stands in for SCM's repo name, so the emoji plus the name.
 */
export function repoVariableValue(
  change: TitleChange,
  repo: { name: string; emoji: string } | undefined,
): string | undefined {
  if (change.written !== undefined) {
    return repo ? `${repo.emoji} ` : "";
  }
  return repo && `${repo.emoji} ${repo.name}`;
}

/**
 * The value to restore when the search emoji is turned off: the previous one,
 * but only if `window.title` is still what Toucan wrote. If the user edited
 * it since, their edit stays.
 */
export function titleToRestore(
  change: TitleChange,
  current: string | undefined,
): { restore: true; value: string | undefined } | { restore: false } {
  if (change.written === undefined || current !== change.written) {
    return { restore: false };
  }
  return { restore: true, value: change.previous };
}

/**
 * The global step a window takes for the search emoji (toucan-v1/0015): ask for consent
 * when the feature is on but nothing is recorded yet, restore when it's off
 * but a change is recorded. Only the focused window does either, so several
 * open windows don't all ask.
 */
export function searchEmojiStep(state: {
  enabled: boolean;
  focused: boolean;
  change: TitleChange | undefined;
}): "ask" | "restore" | "none" {
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

/** Whether a window shows the emoji label (otherwise it hands the key back). */
export function shouldLabel(enabled: boolean, change: TitleChange | undefined): boolean {
  return enabled && change !== undefined;
}

/**
 * Whether a recorded change was never applied: Toucan records it (pending)
 * before writing `window.title`, so if the window died in between, the record
 * stays pending and the title is still the previous one. Dropping it lets the
 * next step ask again. A settled record is never dropped (another window's
 * view of the title can lag behind the write), and neither is a recent
 * pending one (its write may still be under way in another window).
 */
export function unappliedChange(
  change: TitleChange,
  currentTitle: string | undefined,
  now: number,
): boolean {
  return (
    change.pendingSince !== undefined &&
    now - change.pendingSince > PENDING_STALE_MS &&
    change.written !== undefined &&
    currentTitle === change.previous
  );
}
