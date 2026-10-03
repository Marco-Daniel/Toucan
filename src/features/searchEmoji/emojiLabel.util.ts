// import utils
import { EMOJI_VARIABLE_NAME, LEAD_VARIABLE_NAME, titleValues } from "./windowTitle.util.ts";
import { errorText, tryCatch } from "../../shared/async/tryCatch.util.ts";

/** Toucan's context key behind `${toucanRepoLead}` (toucan-v1/0007). */
export const LEAD_CONTEXT = "toucan.repoLead";
/** Toucan's context key behind `${toucanRepoEmoji}` (toucan-v1/0007). */
export const EMOJI_CONTEXT = "toucan.repoEmoji";

export interface EmojiLabelPorts {
  /** Registers a window title variable backed by a context key; may reject. */
  register(name: string, contextKey: string): Promise<void>;
  setContext(key: string, value: string): Promise<void>;
  warn(message: string): void;
}

interface ApplyArgs {
  repo: { emoji: string } | undefined;
  hasEditor: boolean;
  hasSlot: boolean;
}

/**
 * Sets the search emoji's two title variables in this window (see
 * `titleValues`). They're registered through an internal command (ADR-0003).
 * If that fails, Toucan says so once, never tries again in this window, and
 * shows no emoji: the unregistered variables render empty, so the title reads
 * like VS Code's own.
 */
export class EmojiLabel {
  /** `undefined` until the first attempt, then whether both variables are registered. */
  private registered: boolean | undefined;
  private readonly ports: EmojiLabelPorts;

  constructor(ports: EmojiLabelPorts) {
    this.ports = ports;
  }

  async apply({ repo, hasEditor, hasSlot }: ApplyArgs): Promise<void> {
    if (!(await this.register())) {
      return;
    }
    const values = titleValues({ repo, hasEditor, hasSlot });
    await this.ports.setContext(LEAD_CONTEXT, values.lead);
    await this.ports.setContext(EMOJI_CONTEXT, values.beforeRoot);
  }

  /** Empties both variables, e.g. when the feature is turned off. */
  async clear(): Promise<void> {
    if (!this.registered) {
      return;
    }
    await this.ports.setContext(LEAD_CONTEXT, "");
    await this.ports.setContext(EMOJI_CONTEXT, "");
  }

  private async register(): Promise<boolean> {
    if (this.registered === undefined) {
      const [, error] = await tryCatch(async () => {
        await this.ports.register(LEAD_VARIABLE_NAME, LEAD_CONTEXT);
        await this.ports.register(EMOJI_VARIABLE_NAME, EMOJI_CONTEXT);
      });
      this.registered = error === null;
      if (error !== null) {
        this.ports.warn(
          `Couldn't register the search emoji's title variables, so it doesn't show: ${errorText(error)}`,
        );
      }
    }
    return this.registered;
  }
}
