import { tryCatch } from "./tryCatch.ts";
import {
  SIDEBAR_STYLES,
  SIDEBAR_VISIBILITIES,
  type SidebarStyle,
  type SidebarVisibility,
} from "./model.ts";

/** How long a user close must last before it's remembered (see `visibilityChanged`). */
export const REMEMBER_CLOSE_DELAY_MS = 1500;

export interface SidebarSettings {
  enabled: boolean;
  /** The repo's override, or else the general setting (0013). */
  visibility: SidebarVisibility;
}

/**
 * The block's effective settings from the raw setting values (0013): enabled
 * only for a repo with a color; the repo's own visibility override wins over
 * the general one; anything unexpected falls back to the defaults.
 */
export function resolveSidebarSettings(input: {
  enabled: unknown;
  style: unknown;
  visibility: unknown;
  repo: { sidebarBlock?: SidebarVisibility } | undefined;
}): SidebarSettings & { style: SidebarStyle } {
  const general = oneOf(SIDEBAR_VISIBILITIES, input.visibility) ?? "always";
  return {
    enabled: input.repo !== undefined && input.enabled === true,
    visibility: input.repo?.sidebarBlock ?? general,
    style: oneOf(SIDEBAR_STYLES, input.style) ?? "full",
  };
}

function oneOf<T extends string>(options: readonly T[], value: unknown): T | undefined {
  return (options as readonly unknown[]).includes(value) ? (value as T) : undefined;
}

export interface SidebarPorts {
  /** Reveals the block with `preserveFocus`, never switching other views. */
  reveal(): Promise<void>;
  /** Closes the secondary sidebar. */
  closeBar(): Promise<void>;
  /** Whether the user closed the block in this workspace (`always` mode, 0013). */
  readClosed(): boolean;
  writeClosed(closed: boolean): Promise<void>;
  warn(message: string): void;
  debug(message: string): void;
}

/**
 * Shows and hides the opt-in sidebar block (0006, 0013).
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
  private rememberTimer: ReturnType<typeof setTimeout> | undefined;

  private readonly ports: SidebarPorts;
  private readonly settings: () => SidebarSettings;

  constructor(ports: SidebarPorts, settings: () => SidebarSettings) {
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
      this.post("Revealing the block", this.reveal(visibility === "unfocused"));
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
        this.post("Revealing the block", this.reveal(true));
      }
    } else if (this.openedByToucan && this.visible) {
      this.openedByToucan = false;
      this.closingByToucan = true; // cleared by its visibility event or the next focus change
      this.ports.debug("closing the bar Toucan opened");
      this.post("Closing the bar", this.ports.closeBar());
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
      this.cancelRemember();
      // Only the user's own open forgets their close, not Toucan's reveal.
      if (!this.revealing && this.ports.readClosed()) {
        this.ports.debug("block opened; forgetting the remembered close");
        this.post("Forgetting the close", this.ports.writeClosed(false));
      }
      return;
    }
    if (this.closingByToucan) {
      this.closingByToucan = false;
      return;
    }
    const { enabled, visibility } = this.settings();
    if (enabled && visibility === "always" && this.focused) {
      this.cancelRemember();
      // Keeps running across a blur (close, then Cmd-Tab away); a reload or
      // shutdown still never records one, because dispose cancels it.
      this.rememberTimer = setTimeout(() => {
        this.rememberTimer = undefined;
        if (!this.visible) {
          this.ports.debug("user closed the block; remembering");
          this.post("Remembering the close", this.ports.writeClosed(true));
        }
      }, REMEMBER_CLOSE_DELAY_MS);
    }
  }

  /** After a settings change: shows the block if it now should be. */
  settingsChanged(): void {
    const { enabled, visibility } = this.settings();
    if (this.disposed || !this.started || !enabled || this.visible) {
      return;
    }
    if (visibility === "always" ? !this.ports.readClosed() : !this.focused) {
      this.post("Revealing the block", this.reveal(visibility === "unfocused"));
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
    this.cancelRemember();
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
  private post(what: string, task: Promise<void>): void {
    // oxlint-disable-next-line typescript/no-floating-promises -- no caller to await (see above); settle never rejects
    this.settle(what, task);
  }

  private async settle(what: string, task: Promise<void>): Promise<void> {
    const [, error] = await tryCatch(task);
    if (error !== null) {
      this.ports.warn(`${what} failed: ${String(error)}`);
    }
  }

  private cancelRemember(): void {
    if (this.rememberTimer !== undefined) {
      clearTimeout(this.rememberTimer);
      this.rememberTimer = undefined;
    }
  }
}
