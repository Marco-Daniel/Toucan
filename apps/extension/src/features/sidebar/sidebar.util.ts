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
  /** The setting is on and the repo has a color: the block can be shown. */
  enabled: boolean;
  /** The setting alone, whatever the repo has. */
  settingOn: boolean;
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
    settingOn: input.enabled === true,
    style: isOneOf(SIDEBAR_STYLES, input.style) ? input.style : "full",
  };
}

export interface SidebarPorts {
  /** Reveals the block with `preserveFocus`, expanding it. It switches the primary sidebar to the Explorer, so only a user's own action may run it. */
  reveal(): Promise<void>;
  /** Sets the view's `when` key: `false` hides the block, `true` lets VS Code show it. */
  setShown(shown: boolean): Promise<void>;
  /** Whether the block is remembered as closed in this workspace. */
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
 * Shows and hides the opt-in sidebar block in the Explorer (sidebar-explorer/0001,
 * sidebar-explorer/0006).
 *
 * VS Code starts every extension view in the Explorer collapsed, whatever the
 * manifest says, and a reveal (`.focus`) switches the primary sidebar to the
 * Explorer. So Toucan reveals the block only on the user's own action: Toggle
 * Sidebar Block (show), and the setting going from off to on while the window
 * runs, by any route. Never on startup, never when a repo gets a color, never
 * on a reload where the setting was already on (sidebar-explorer/0008).
 *
 * Collapsing it, showing another view or hiding the sidebar are not closes. A
 * close is the user's Hide from the Explorer's "..." menu, or Toggle Sidebar
 * Block. A Hide arrives as a dispose while the block should be shown; it is
 * remembered only if the view isn't resolved again within the delay (a move
 * disposes and resolves it again), and a reload or shutdown never records one,
 * because dispose cancels the timer.
 */
export class SidebarController {
  /** After dispose nothing may change state: VS Code can still dispose a view and fire its events. */
  private disposed = false;
  private visible = false;
  /** The setting's value at the last change, to tell it going on from anything else. */
  private settingWasOn: boolean;
  private readonly hideTimer = createTimer();

  private readonly ports: SidebarPorts;
  private readonly settings: () => SidebarSettings;

  constructor({ ports, settings }: SidebarControllerArgs) {
    this.ports = ports;
    this.settings = settings;
    this.settingWasOn = settings().settingOn;
  }

  /** After a change to the enabled setting or the style, once the context keys are set. */
  settingsChanged(): void {
    if (this.disposed) {
      return;
    }
    const { enabled, settingOn } = this.settings();
    const turnedOn = settingOn && !this.settingWasOn;
    this.settingWasOn = settingOn;
    // A block remembered as hidden stays hidden: the user brings it back with Toggle.
    if (turnedOn && enabled && !this.ports.readClosed()) {
      this.post({ what: "Revealing the block", task: () => this.ports.reveal() });
    }
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
    if (!this.settings().enabled || this.ports.readClosed()) {
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
