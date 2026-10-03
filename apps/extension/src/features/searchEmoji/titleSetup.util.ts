// import utils
import {
  currentForm,
  LEAD_VARIABLE,
  searchEmojiStep,
  titleToRestore,
  titleWithEmoji,
  unappliedChange,
  writtenForms,
} from "./windowTitle.util.ts";
import { tryCatch } from "../../shared/async/tryCatch.util.ts";

// import types
import type { TitleChange } from "./windowTitle.util.ts";

/** `window.title` as `inspect()` reports it. */
export interface TitleSettings {
  /** The user-level value, or `undefined` when unset. */
  global: string | undefined;
  default: string | undefined;
  /** Whether this workspace or folder sets its own title, which hides the variable here. */
  overridden: boolean;
}

export interface TitlePorts {
  enabled(): boolean;
  focused(): boolean;
  now(): number;
  /** Read fresh on every call: another window or Settings Sync can change it. */
  title(): TitleSettings;
  readChange(): TitleChange | undefined;
  writeChange(change: TitleChange | undefined): Promise<void>;
  writeTitle(value: string | undefined): Promise<void>;
  /** Turns the search emoji setting off (the user declined). */
  disable(): Promise<void>;
  /** The modal consent dialog; true when the user agreed. */
  ask(overridden: boolean): Promise<boolean>;
  info(message: string): void;
  /** Changing window.title failed: logged and shown to the user. */
  failed(error: unknown): void;
}

/**
 * The global `window.title` side of the search emoji (toucan-v1/0015): heal a crashed
 * write, ask for consent and apply, or restore. The record is written before
 * the title, so a window that dies in between can still restore it.
 */
export class TitleSetup {
  private asking = false;
  private readonly ports: TitlePorts;

  constructor(ports: TitlePorts) {
    this.ports = ports;
  }

  /** Brings `window.title` in line with the setting; returns the change now recorded. */
  async settle(): Promise<TitleChange | undefined> {
    const { ports } = this;
    const enabled = ports.enabled();
    const focused = ports.focused();
    let change = ports.readChange();
    // Only the focused window heals: it's the one that may have crashed mid-write.
    if (
      focused &&
      change &&
      unappliedChange({ change, currentTitle: ports.title().global, now: ports.now() })
    ) {
      await ports.writeChange(undefined);
      change = undefined;
    }
    if (enabled && focused && change) {
      change = await this.upgrade(change);
    }
    const step = searchEmojiStep({ enabled, focused, change });
    if (step === "ask") {
      const [, error] = await tryCatch(() => this.askAndApply());
      if (error !== null) {
        // The record was cleared again in askAndApply; just tell the user.
        ports.failed(error);
      }
    } else if (step === "restore" && change) {
      await this.restore(change);
    }
    return ports.readChange();
  }

  private async askAndApply(): Promise<void> {
    if (this.asking) {
      return;
    }
    this.asking = true;
    try {
      const { ports } = this;
      let title = ports.title();
      if (this.written(title) !== undefined) {
        if (!(await ports.ask(title.overridden))) {
          await ports.disable();
          return;
        }
        // The dialog can stay open for a while; don't write a stale title.
        title = ports.title();
      }
      const previous = title.global;
      const written = this.written(title);
      await ports.writeChange({
        previous,
        written,
        ...(written !== undefined ? { pendingSince: ports.now() } : {}),
      });
      if (written === undefined) {
        return;
      }
      const [, error] = await tryCatch(() => ports.writeTitle(written));
      if (error !== null) {
        await ports.writeChange(undefined);
        throw error;
      }
      // Settled: no longer pending.
      await ports.writeChange({ previous, written });
      ports.info("Changed window.title for the search emoji.");
    } finally {
      this.asking = false;
    }
  }

  /**
   * Moves a title an earlier version wrote to today's form (toucan-v1/0007)
   * without asking again: the user consented to Toucan's title, and restore
   * still brings back theirs. Only while the title is still a form of what
   * Toucan wrote; one the user edited since is left alone. The title goes
   * first; if the window dies before the record, the next focused window finds
   * today's form already there and only records it, and restore accepts every
   * form meanwhile.
   *
   * A record without a written title is from an earlier version that used the
   * user's own `${activeRepositoryName}` without changing the title. Toucan no
   * longer uses that variable, so unless the title already has Toucan's own,
   * the record goes and the user is asked again.
   */
  private async upgrade(change: TitleChange): Promise<TitleChange | undefined> {
    const { ports } = this;
    const { written } = change;
    const current = ports.title().global;
    if (written === undefined) {
      if (current?.includes(LEAD_VARIABLE)) {
        return change;
      }
      await ports.writeChange(undefined);
      return undefined;
    }
    const upgraded = currentForm(written);
    if (upgraded === written || current === undefined || !writtenForms(written).includes(current)) {
      return change;
    }
    if (current !== upgraded) {
      const [, error] = await tryCatch(() => ports.writeTitle(upgraded));
      if (error !== null) {
        // The old title and its record still match, so nothing to undo.
        ports.failed(error);
        return change;
      }
    }
    const next = { previous: change.previous, written: upgraded };
    await ports.writeChange(next);
    ports.info("Moved window.title to the search emoji's own variables.");
    return next;
  }

  private written(title: TitleSettings): string | undefined {
    return titleWithEmoji(title.global ?? title.default ?? "");
  }

  private async restore(change: TitleChange): Promise<void> {
    const result = titleToRestore({ change, current: this.ports.title().global });
    if (result.restore) {
      await this.ports.writeTitle(result.value);
      this.ports.info("Restored window.title.");
    } else if (change.written !== undefined) {
      this.ports.info("Left window.title alone: it was changed after Toucan set it.");
    }
    await this.ports.writeChange(undefined);
  }
}
