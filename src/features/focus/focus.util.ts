import { createLock } from "../../shared/async/lock.util.ts";
import { customizationsFor, mergeCustomizations } from "./merge.util.ts";
import type { CommandCenterColors } from "../../shared/model/model.types.ts";
import type { SettingsUpdate } from "../settings/settingsWrite.util.ts";
import { isRecord } from "../../shared/records/records.util.ts";
import { errorText, tryCatch, tryCatchSync } from "../../shared/async/tryCatch.util.ts";

/**
 * Delay before an unfocused window clears the Command Center colors. Switching
 * to another VS Code window doesn't wait for it (that window writes at once),
 * so it only matters when leaving VS Code, where the color isn't visible. A
 * longer delay saves writes on brief app switches and widens the race margin.
 */
export const BLUR_DEBOUNCE_MS = 1000;
/** How much longer than the blur debounce a focused window waits before checking. */
const VERIFY_MARGIN_MS = 250;
/** Delay before a focused window checks that its colors survived (self-heal). */
export const VERIFY_DELAY_MS = BLUR_DEBOUNCE_MS + VERIFY_MARGIN_MS;

/** Everything the coordinator touches outside itself, so tests can fake it. */
export interface FocusPorts {
  /** The id of the window that last took focus, or `undefined` if unknown or unreadable. */
  readOwner(): Promise<string | undefined>;
  writeOwner(id: string): Promise<void>;
  /**
   * VS Code's view of the user-level `workbench.colorCustomizations` (never a
   * merged value). Every write is built on this, because it comes from the
   * settings file this window actually uses. It can lag behind other windows.
   */
  readCustomizations(): unknown;
  /**
   * The same value read straight from the settings file, or `undefined` when
   * it can't be read. Only used to notice that the view is stale; never
   * written back, because the file may not be this window's.
   */
  readCustomizationsFromDisk(): Promise<{ value: unknown } | undefined>;
  /**
   * Writes the value `update` computes from the user value at write time, so
   * a user edit made while this window waited isn't overwritten with an older
   * value.
   */
  writeCustomizations(update: SettingsUpdate): Promise<void>;
  /**
   * Whether Toucan has applied a color in this profile before (0008): until
   * it has, it never clears `commandCenter.*`, so colors the user set by hand
   * survive installing Toucan.
   */
  hasApplied(): boolean;
  markApplied(): Promise<void>;
  warn(message: string): void;
  /** Diagnostics, shown at the output channel's debug level. */
  debug(message: string): void;
}

interface FocusCoordinatorArgs {
  /** This window's id, written to the owner file. */
  id: string;
  ports: FocusPorts;
  /** This window's colors, or `undefined` for an unconfigured repo. */
  desired: () => CommandCenterColors | undefined;
}

/**
 * Applies this window's Command Center colors while it's focused and clears
 * them after it loses focus, unless another window has taken over (0002).
 * Ownership is a window id the focused window writes before its colors, so a
 * window only clears colors it still owns. Leftovers from crashed windows are
 * fixed lazily at the next focus of any window.
 */
export class FocusCoordinator {
  private focused = false;
  private blurTimer: ReturnType<typeof setTimeout> | undefined;
  private verifyTimer: ReturnType<typeof setTimeout> | undefined;
  /** This window's own focus tasks run one at a time. */
  private readonly lock = createLock();
  private failing = false;
  /** The file snapshot last answered with a rewrite, so a wrong file can't cause repeats. */
  private staleSnapshot: string | undefined;

  private readonly id: string;
  private readonly ports: FocusPorts;
  /** This window's colors, or `undefined` for an unconfigured repo. */
  private readonly desired: () => CommandCenterColors | undefined;

  constructor({ id, ports, desired }: FocusCoordinatorArgs) {
    this.id = id;
    this.ports = ports;
    this.desired = desired;
  }

  /** Feed every window state change; only real `focused` transitions act. */
  setFocused(focused: boolean): void {
    if (focused === this.focused) {
      return;
    }
    this.focused = focused;
    this.ports.debug(focused ? "focused" : "blurred");
    if (focused) {
      this.cancel("blur");
      this.post(() => this.takeOver());
    } else {
      this.cancel("verify");
      this.blurTimer = setTimeout(() => {
        this.blurTimer = undefined;
        this.post(() => this.clearIfOwner());
      }, BLUR_DEBOUNCE_MS);
    }
  }

  /** Re-applies after a `toucan.*` change. Unfocused windows never write. */
  refresh(): void {
    if (this.focused) {
      this.post(() => this.takeOver());
    }
  }

  /**
   * Call on every `workbench.colorCustomizations` change. The focused owner
   * re-applies if its colors went missing: a window's view of the settings can
   * lag, so a new window may first see colors that another window's blur has
   * already cleared. Only the focused owner writes, and only on a real
   * difference, so windows never fight and nothing loops.
   */
  customizationsChanged(): void {
    if (this.focused) {
      this.post(() => this.verify());
    }
  }

  /** Best-effort clear on deactivate; the window may close before it finishes. */
  async dispose(): Promise<void> {
    this.cancel("blur");
    this.cancel("verify");
    this.focused = false;
    await this.enqueue(() => this.clearIfOwner());
  }

  private async takeOver(): Promise<void> {
    const colors = this.desired();
    if (colors === undefined && !this.ports.hasApplied()) {
      // Not managing commandCenter.* yet (0008). Taking ownership anyway would
      // stop the previous owner's blur from clearing its colors here.
      this.ports.debug("not taking ownership: no color to apply or clear yet");
      return;
    }
    // Owner first: another window's pending blur checks it before clearing.
    const [, ownerError] = await tryCatch(() =>
      this.ports.writeOwner(this.id).then(() => this.ports.debug("took ownership")),
    );
    if (ownerError !== null) {
      // Apply the colors anyway: better colored now than waiting for the next
      // focus change; the verify step heals if another window clears them.
      this.ports.warn(`Couldn't record this window as the color owner: ${errorText(ownerError)}`);
    }
    await this.write(colors);
    this.cancel("verify");
    this.verifyTimer = setTimeout(() => {
      this.verifyTimer = undefined;
      this.post(() => this.verify());
    }, VERIFY_DELAY_MS);
  }

  /** Re-applies if a racing blur from another window wiped this window's colors. */
  private async verify(): Promise<void> {
    const owner = await this.ports.readOwner();
    this.ports.debug(`verify: focused=${this.focused} owner=${owner === this.id ? "me" : owner}`);
    if (this.focused && owner === this.id) {
      await this.write(this.desired());
    }
  }

  private async clearIfOwner(): Promise<void> {
    const owner = await this.ports.readOwner();
    this.ports.debug(
      `blur check: focused=${this.focused} owner=${owner === this.id ? "me" : owner}`,
    );
    if (!this.focused && owner === this.id) {
      await this.write(undefined);
    }
  }

  private async write(colors: CommandCenterColors | undefined): Promise<void> {
    if (colors === undefined && !this.ports.hasApplied()) {
      this.ports.debug("not managing commandCenter.* yet: no color applied in this profile");
      return;
    }
    const view = this.ports.readCustomizations();
    const result = mergeCustomizations({ current: view, colors });
    if (result.changed) {
      // A real change makes any earlier file snapshot meaningless.
      this.staleSnapshot = undefined;
    } else {
      // The view already matches. Write it anyway only if the file shows a
      // stale view: another window changed Toucan's keys and this window
      // missed it. If the file is another profile's, it stays "stale"; the
      // snapshot check limits that to one redundant write per file change.
      const disk = await this.ports.readCustomizationsFromDisk();
      const stale =
        disk !== undefined && mergeCustomizations({ current: disk.value, colors }).changed;
      // Wrapped, so a file where the setting is gone ("undefined") still
      // gives a snapshot distinct from "none yet".
      const snapshot = stale ? JSON.stringify([disk.value]) : undefined;
      if (!stale) {
        this.staleSnapshot = undefined;
      }
      if (!stale || snapshot === this.staleSnapshot || (view !== undefined && !isRecord(view))) {
        this.ports.debug(colors ? "colors already applied" : "nothing to clear");
        // Toucan's colors are in effect (a reinstall or Settings Sync can
        // leave them without the flag): from now on it manages them. Not for
        // a non-object setting, which Toucan never writes over.
        if (isRecord(view)) {
          await this.recordApplied(colors);
        }
        return;
      }
      this.staleSnapshot = snapshot;
      this.ports.debug("settings view is stale; rewriting");
    }
    const [, error] = await tryCatch(() =>
      // Toucan's keys merged onto whatever the user value is when it's written.
      this.ports
        .writeCustomizations((current) => customizationsFor({ current, colors }))
        .then(() => {
          this.ports.debug(colors ? `applied ${colors.background}` : "cleared");
          this.failing = false;
        }),
    );
    if (error !== null) {
      // Log once per failure streak, e.g. while settings.json has unsaved edits.
      const first = !this.failing;
      this.failing = true;
      if (first) {
        this.ports.warn(`Couldn't update workbench.colorCustomizations: ${errorText(error)}`);
      }
      return;
    }
    await this.recordApplied(colors);
  }

  /** Records the first applied color in this profile (0008); a failure here isn't a settings failure. */
  private async recordApplied(colors: CommandCenterColors | undefined): Promise<void> {
    if (!colors || this.ports.hasApplied()) {
      return;
    }
    const [, error] = await tryCatch(() => this.ports.markApplied());
    if (error !== null) {
      this.ports.warn(`Couldn't record that Toucan applied a color: ${errorText(error)}`);
    }
  }

  private cancel(timer: "blur" | "verify"): void {
    const handle = timer === "blur" ? this.blurTimer : this.verifyTimer;
    if (handle !== undefined) {
      clearTimeout(handle);
    }
    if (timer === "blur") {
      this.blurTimer = undefined;
    } else {
      this.verifyTimer = undefined;
    }
  }

  /**
   * Queues a task from a sync event handler or timer, which has no caller to
   * await it. The queue owns the promise: enqueue logs every failure and never
   * rejects, and dispose waits behind it.
   */
  private post(task: () => Promise<void>): void {
    // oxlint-disable-next-line typescript/no-floating-promises -- no caller to await (see above); the queue never rejects
    this.enqueue(task);
  }

  /** Runs tasks one at a time, so this window's own writes never interleave. */
  private enqueue(task: () => Promise<void>): Promise<void> {
    return this.lock(async () => {
      const [, error] = await tryCatch(() => task());
      if (error !== null) {
        // Logging can fail during shutdown; the queue must keep going.
        tryCatchSync(() => this.ports.warn(`Focus handling failed: ${errorText(error)}`));
      }
    });
  }
}
