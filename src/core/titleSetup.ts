import {
  searchEmojiStep,
  titleToRestore,
  titleWithRepoVariable,
  unappliedChange,
} from "./windowTitle.ts";
import type { TitleChange } from "./windowTitle.ts";

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
 * The global `window.title` side of the search emoji (0015): heal a crashed
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
    if (focused && change && unappliedChange(change, ports.title().global, ports.now())) {
      await ports.writeChange(undefined);
      change = undefined;
    }
    const step = searchEmojiStep({ enabled, focused, change });
    if (step === "ask") {
      try {
        await this.askAndApply();
      } catch (error) {
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
      try {
        await ports.writeTitle(written);
      } catch (error) {
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

  private written(title: TitleSettings): string | undefined {
    return titleWithRepoVariable(title.global ?? title.default ?? "");
  }

  private async restore(change: TitleChange): Promise<void> {
    const result = titleToRestore(change, this.ports.title().global);
    if (result.restore) {
      await this.ports.writeTitle(result.value);
      this.ports.info("Restored window.title.");
    } else if (change.written !== undefined) {
      this.ports.info("Left window.title alone: it was changed after Toucan set it.");
    }
    await this.ports.writeChange(undefined);
  }
}
