// import utils
import { tryCatch } from "../../shared/async/tryCatch.util.ts";
import { isOneOf } from "../../shared/guards/oneOf.util.ts";
import { createTimer } from "../../shared/async/timer.util.ts";
import { logFailure } from "../../shared/async/logFailure.util.ts";

// import consts
import { SIDEBAR_STYLES, SIDEBAR_VISIBILITIES } from "../../shared/model/model.consts.ts";

// import types
import type { SidebarStyle, SidebarVisibility } from "../../shared/model/model.types.ts";

/** How long a user close must last before it's remembered (see `visibilityChanged`). */
export const REMEMBER_CLOSE_DELAY_MS = 1500;

export interface SidebarSettings {
  enabled: boolean;
  /** The repo's override, or else the general setting (toucan-v1/0013). */
  visibility: SidebarVisibility;
}

interface ResolveSidebarSettingsArgs {
  enabled: unknown;
  style: unknown;
  visibility: unknown;
  repo: { sidebarBlock?: SidebarVisibility } | undefined;
}

/**
 * The block's effective settings from the raw setting values (toucan-v1/0013): enabled
 * only for a repo with a color; the repo's own visibility override wins over
 * the general one; anything unexpected falls back to the defaults.
 */
export function resolveSidebarSettings(
  input: ResolveSidebarSettingsArgs,
): SidebarSettings & { style: SidebarStyle } {
  const general = isOneOf(SIDEBAR_VISIBILITIES, input.visibility) ? input.visibility : "always";
  return {
    enabled: input.repo !== undefined && input.enabled === true,
    visibility: input.repo?.sidebarBlock ?? general,
    style: isOneOf(SIDEBAR_STYLES, input.style) ? input.style : "full",
  };
}

export interface SidebarPorts {
  /** Reveals the block with `preserveFocus`, never switching other views. */
  reveal(): Promise<void>;
  /** Closes the secondary sidebar. */
  closeBar(): Promise<void>;
  /** Whether the user closed the block in this workspace (`always` mode, toucan-v1/0013). */
  readClosed(): boolean;
  writeClosed(closed: boolean): Promise<void>;
  warn(message: string): void;
  debug(message: string): void;
}

/** Background work started from an event or timer, and what to call it in a warning. */
interface HandOffArgs {
  what: string;
  task: () => Promise<void>;
}

interface SidebarControllerArgs {
  ports: SidebarPorts;
  /** The block's effective settings, read fresh on every change. */
  settings: () => SidebarSettings;
}

/**
 * Shows and hides the opt-in sidebar block (toucan-v1/0006, toucan-v1/0013).
 *
 * `always`: revealed on startup unless the user closed it in this workspace.
 * A close counts when the block stops being visible while the window is
 * focused and Toucan didn't cause it, which includes switching the secondary
 * sidebar to another view. It's remembered after a delay, so a reload or
 * shutdown (which ends the extension host first) never records one. Toucan
 * never closes the bar on startup; VS Code restores the user's layout.
 *
 * `unfocused`: revealed on blur. On focus the bar is closed again, but only if
 * Toucan opened it.
 */
export class SidebarController {
  private started = false;
  /** After dispose nothing may change state: VS Code can still dispose a view and fire its events. */
  private disposed = false;
  private revealing = false;
  private focused = false;
  private visible = false;
  private openedByToucan = false;
  private closingByToucan = false;
  private readonly rememberTimer = createTimer();

  private readonly ports: SidebarPorts;
  private readonly settings: () => SidebarSettings;

  constructor({ ports, settings }: SidebarControllerArgs) {
    this.ports = ports;
    this.settings = settings;
  }

  /** Call once at activation, after the repo is resolved. */
  start(focused: boolean): void {
    this.started = true;
    this.focused = focused;
    const { enabled, visibility } = this.settings();
    if (!enabled) {
      return;
    }
    if (visibility === "always" ? !this.ports.readClosed() : !focused) {
      this.post({
        what: "Revealing the block",
        task: () => this.reveal(visibility === "unfocused"),
      });
    }
  }

  setFocused(focused: boolean): void {
    if (this.disposed || focused === this.focused) {
      return;
    }
    this.focused = focused;
    this.ports.debug(focused ? "focused" : "blurred");
    // A close Toucan asked for that produced no visibility event mustn't
    // swallow the user's next real close.
    this.closingByToucan = false;
    const { enabled, visibility } = this.settings();
    if (!enabled || visibility !== "unfocused") {
      return;
    }
    if (!focused) {
      // Leave a block the user already has open alone, and don't close it later.
      if (this.visible) {
        this.openedByToucan = false;
      } else {
        this.post({ what: "Revealing the block", task: () => this.reveal(true) });
      }
    } else if (this.openedByToucan && this.visible) {
      this.openedByToucan = false;
      this.closingByToucan = true; // cleared by its visibility event or the next focus change
      this.ports.debug("closing the bar Toucan opened");
      this.post({ what: "Closing the bar", task: () => this.ports.closeBar() });
    } else {
      this.openedByToucan = false;
    }
  }

  /** Feed the block's `onDidChangeVisibility`; `false` also on dispose. */
  visibilityChanged(visible: boolean): void {
    if (this.disposed) {
      return;
    }
    this.ports.debug(
      `visible=${visible} focused=${this.focused} closingByToucan=${this.closingByToucan}`,
    );
    this.visible = visible;
    if (visible) {
      this.rememberTimer.cancel();
      // Only the user's own open forgets their close, not Toucan's reveal.
      if (!this.revealing && this.ports.readClosed()) {
        this.ports.debug("block opened; forgetting the remembered close");
        this.post({ what: "Forgetting the close", task: () => this.ports.writeClosed(false) });
      }
      return;
    }
    if (this.closingByToucan) {
      this.closingByToucan = false;
      return;
    }
    const { enabled, visibility } = this.settings();
    if (enabled && visibility === "always" && this.focused) {
      // Keeps running across a blur (close, then Cmd-Tab away); a reload or
      // shutdown still never records one, because dispose cancels it.
      this.rememberTimer.start({
        ms: REMEMBER_CLOSE_DELAY_MS,
        run: () => {
          if (!this.visible) {
            this.ports.debug("user closed the block; remembering");
            this.post({ what: "Remembering the close", task: () => this.ports.writeClosed(true) });
          }
        },
      });
    }
  }

  /**
   * After a settings change: shows the block if it now should be, or closes the
   * bar Toucan opened for a block that went off. Call it before the block's view
   * is hidden, so a block that goes off is still seen as visible.
   */
  settingsChanged(): void {
    const { enabled, visibility } = this.settings();
    if (this.disposed || !this.started) {
      return;
    }
    if (!enabled) {
      // The repo lost its color, or the setting went off. Like the focus path,
      // close only a bar Toucan opened: one the user opened may hold Chat or
      // other views, so it stays, even if the block was all it showed. Only
      // `unfocused` mode opens the bar for Toucan, so `always` never closes it.
      if (this.openedByToucan && this.visible) {
        this.openedByToucan = false;
        this.closingByToucan = true; // cleared by its visibility event or the next focus change
        this.ports.debug("closing the bar Toucan opened: the block is off");
        this.post({ what: "Closing the bar", task: () => this.ports.closeBar() });
      }
      return;
    }
    if (this.visible) {
      return;
    }
    if (visibility === "always" ? !this.ports.readClosed() : !this.focused) {
      this.post({
        what: "Revealing the block",
        task: () => this.reveal(visibility === "unfocused"),
      });
    }
  }

  /** Toggle Sidebar Block: a user action, so closing it is remembered like any close. */
  async toggle(): Promise<void> {
    if (this.visible) {
      await this.ports.closeBar();
    } else {
      this.openedByToucan = false;
      await this.ports.writeClosed(false);
      await this.ports.reveal();
    }
  }

  dispose(): void {
    this.disposed = true;
    this.rememberTimer.cancel();
  }

  private async reveal(byToucan: boolean): Promise<void> {
    if (this.revealing) {
      return;
    }
    this.revealing = true;
    this.ports.debug("revealing the block");
    this.openedByToucan = byToucan;
    try {
      await this.ports.reveal();
    } finally {
      this.revealing = false;
    }
  }

  /**
   * Finishes work started by a sync event handler or timer, which has no
   * caller to await it: a failure is logged, never left unhandled.
   */
  private post({ what, task }: HandOffArgs): void {
    // oxlint-disable-next-line typescript/no-floating-promises -- no caller to await (see above); settle never rejects
    this.settle({ what, task });
  }

  private async settle({ what, task }: HandOffArgs): Promise<void> {
    const [, error] = await tryCatch(task);
    if (error !== null) {
      logFailure({ log: this.ports, what, error });
    }
  }
}
