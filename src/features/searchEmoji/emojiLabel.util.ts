// import utils
import { titleValues } from "./windowTitle.util.ts";
import { errorText, tryCatch } from "../../shared/async/tryCatch.util.ts";

// import types
import type { TitleChange } from "./windowTitle.util.ts";

/** The per-window context key behind `${activeRepositoryName}` (internal to VS Code). */
export const REPO_NAME_CONTEXT = "scmActiveRepositoryName";
/** Toucan's own context key behind `${toucanRepoEmoji}` (toucan-v1/0007). */
export const EMOJI_CONTEXT = "toucan.repoEmoji";

export interface EmojiLabelPorts {
  /** Registers `${toucanRepoEmoji}` with the window title; may reject. */
  register(): Promise<void>;
  setContext(key: string, value: string): Promise<void>;
  warn(message: string): void;
}

interface ApplyArgs {
  change: TitleChange;
  repo: { name: string; emoji: string } | undefined;
  hasEditor: boolean;
}

/**
 * Sets the search emoji's two title variables in this window (see
 * `titleValues`). `${toucanRepoEmoji}` is registered through an internal
 * command (ADR-0003); if that fails, Toucan says so once, never tries again in
 * this window, and keeps the emoji in front as if an editor were open, so the
 * label still shows it.
 */
export class EmojiLabel {
  /** `undefined` until the first attempt, then whether the slot is registered. */
  private registered: boolean | undefined;
  private readonly ports: EmojiLabelPorts;

  constructor(ports: EmojiLabelPorts) {
    this.ports = ports;
  }

  /** Sets both keys; `false` when the change says SCM's own value should come back. */
  async apply({ change, repo, hasEditor }: ApplyArgs): Promise<boolean> {
    const values = titleValues({ change, repo, hasEditor });
    if (values === undefined) {
      return false;
    }
    if (await this.slot()) {
      await this.ports.setContext(REPO_NAME_CONTEXT, values.lead);
      await this.ports.setContext(EMOJI_CONTEXT, values.beforeRoot);
    } else {
      // At most one of the two holds the emoji: without the slot it goes in front.
      await this.ports.setContext(REPO_NAME_CONTEXT, values.lead + values.beforeRoot);
    }
    return true;
  }

  private async slot(): Promise<boolean> {
    if (this.registered === undefined) {
      const [, error] = await tryCatch(() => this.ports.register());
      this.registered = error === null;
      if (error !== null) {
        this.ports.warn(
          `Couldn't register the search emoji's title variable, so the emoji stays in front: ${errorText(error)}`,
        );
      }
    }
    return this.registered;
  }
}
