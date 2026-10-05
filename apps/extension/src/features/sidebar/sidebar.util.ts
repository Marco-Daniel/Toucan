// import utils
import { tryCatch } from "../../shared/async/tryCatch.util.ts";
import { isOneOf } from "../../shared/guards/oneOf.util.ts";
import { createTimer } from "../../shared/async/timer.util.ts";
import { logFailure } from "../../shared/async/logFailure.util.ts";

// import consts
import { SIDEBAR_STYLES } from "../../shared/model/model.consts.ts";

// import types
import type { SidebarStyle } from "../../shared/model/model.types.ts";

/** How long a disposed view must stay gone before it counts as a Hide (sidebar-explorer/0006). */
export const REMEMBER_CLOSE_DELAY_MS = 1500;

export interface SidebarSettings {
  enabled: boolean;
}

interface ResolveSidebarSettingsArgs {
  enabled: unknown;
  style: unknown;
  repo: object | undefined;
}

/**
 * The block's effective settings from the raw setting values: enabled only for
 * a repo with a color; an unexpected style falls back to the default. The
 * deprecated visibility settings are no longer read (sidebar-explorer/0002).
 */
export function resolveSidebarSettings(
  input: ResolveSidebarSettingsArgs,
): SidebarSettings & { style: SidebarStyle } {
  return {
    enabled: input.repo !== undefined && input.enabled === true,
    style: isOneOf(SIDEBAR_STYLES, input.style) ? input.style : "full",
  };
}

export interface SidebarPorts {
  /** Reveals the block with `preserveFocus`, expanding it and never switching other views. */
  reveal(): Promise<void>;
  /** Sets the view's `when` key: `false` hides the block, `true` lets VS Code show it. */
  setShown(shown: boolean): Promise<void>;
  /** Whether the block is remembered as closed in this workspace. */
  readClosed(): boolean;
  writeClosed(closed: boolean): Promise<void>;
  /** Whether Toucan has revealed the block in this workspace once already. */
  readRevealed(): boolean;
  writeRevealed(revealed: boolean): Promise<void>;
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
 * Shows and hides the opt-in sidebar block in the Explorer (sidebar-explorer/0001,
 * sidebar-explorer/0006).
 *
 * The block is revealed once per workspace, when it becomes available: at the
 * first start (an upgrade included), when the setting goes on, when the repo
 * gets a color. Never on every startup: VS Code remembers collapse, hide and
 * position, and a reveal would expand a block the user collapsed.
 *
 * Collapsing it, showing another view or hiding the sidebar are not closes. A
 * close is the user's Hide from the Explorer's "..." menu, or Toggle Sidebar
 * Block. A Hide arrives as a dispose while the block should be shown; it is
 * remembered only if the view isn't resolved again within the delay (a move
 * disposes and resolves it again), and a reload or shutdown never records one,
 * because dispose cancels the timer.
 */
export class SidebarController {
  private started = false;
  /** After dispose nothing may change state: VS Code can still dispose a view and fire its events. */
  private disposed = false;
  private revealing = false;
  private available = false;
  private visible = false;
  private readonly hideTimer = createTimer();

  private readonly ports: SidebarPorts;
  private readonly settings: () => SidebarSettings;

  constructor({ ports, settings }: SidebarControllerArgs) {
    this.ports = ports;
    this.settings = settings;
  }

  /** Call once at activation, after the view's context keys are set. */
  start(): void {
    this.started = true;
    this.available = this.settings().enabled;
    this.revealIfDue();
  }

  /** After a settings or repo change, once the context keys are set. */
  settingsChanged(): void {
    if (this.disposed || !this.started) {
      return;
    }
    const { enabled } = this.settings();
    const becameAvailable = enabled && !this.available;
    this.available = enabled;
    this.revealIfDue(becameAvailable);
  }

  /** The view was (re)resolved; `visible` is its state then. */
  viewResolved(visible: boolean): void {
    if (this.disposed) {
      return;
    }
    this.hideTimer.cancel();
    this.visible = visible;
  }

  /** Feed the block's `onDidChangeVisibility`; collapse and other views also report `false`, none of it is a close. */
  visibilityChanged(visible: boolean): void {
    if (this.disposed) {
      return;
    }
    this.ports.debug(`visible=${visible}`);
    this.visible = visible;
  }

  /**
   * Feed the block's `onDidDispose`. While the block should be shown and Toucan
   * didn't hide it, that is the user's Hide, remembered after the delay unless
   * the view comes back first.
   */
  viewDisposed(): void {
    if (this.disposed) {
      return;
    }
    this.visible = false;
    if (!this.started || !this.settings().enabled || this.ports.readClosed()) {
      return;
    }
    this.hideTimer.start({
      ms: REMEMBER_CLOSE_DELAY_MS,
      run: () => {
        this.ports.debug("user hid the block; remembering");
        this.post({ what: "Remembering the hide", task: () => this.remember() });
      },
    });
  }

  /**
   * Toggle Sidebar Block: hides a shown block, otherwise shows it (a hidden or
   * collapsed one is revealed and expanded).
   */
  async toggle(): Promise<void> {
    this.hideTimer.cancel();
    if (this.visible) {
      await this.remember();
      return;
    }
    await this.ports.writeClosed(false);
    await this.ports.setShown(true);
    await this.ports.reveal();
    await this.ports.writeRevealed(true);
  }

  dispose(): void {
    this.disposed = true;
    this.hideTimer.cancel();
  }

  /** Writes the close before hiding the view, so the dispose it causes isn't taken for a Hide. */
  private async remember(): Promise<void> {
    await this.ports.writeClosed(true);
    await this.ports.setShown(false);
  }

  private revealIfDue(becameAvailable = false): void {
    const { enabled } = this.settings();
    if (!enabled || this.ports.readClosed()) {
      return;
    }
    if (becameAvailable || !this.ports.readRevealed()) {
      this.post({ what: "Revealing the block", task: () => this.reveal() });
    }
  }

  private async reveal(): Promise<void> {
    if (this.revealing) {
      return;
    }
    this.revealing = true;
    this.ports.debug("revealing the block");
    const [, error] = await tryCatch(() => this.ports.reveal());
    this.revealing = false;
    if (error !== null) {
      throw error;
    }
    await this.ports.writeRevealed(true);
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
