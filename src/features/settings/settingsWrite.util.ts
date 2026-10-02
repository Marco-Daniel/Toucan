import { randomUUID } from "node:crypto";
import {
  chmod,
  lstat,
  readFile,
  realpath,
  rename,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import { dirname, join } from "node:path";
import { createLock } from "../../shared/async/lock.util.ts";
import { planEdit, viewReflects } from "./settingsEdit.util.ts";

export type SettingsTarget = "profile" | "defaultProfile";

/**
 * Computes the new value from the current user value. `{ value: undefined }`
 * removes the setting; `undefined` leaves it alone.
 */
export type SettingsUpdate = (
  current: unknown,
) => { value: Record<string, unknown> | undefined } | undefined;

/** What the writer needs from VS Code. */
export interface SettingsWritePorts {
  /** VS Code's view of the user value (`inspect(key).globalValue`). */
  view(key: string): unknown;
  /** VS Code's own write (`update(key, value, Global)`): always right, drops comments. */
  update(key: string, value: Record<string, unknown> | undefined): Promise<void>;
  /** File system paths of the documents open with unsaved changes. */
  dirtyFiles(): string[];
  debug(message: string): void;
}

export interface SettingsWriteOptions {
  /** How long VS Code may take to pick up an in-place edit (measured 0.3–1.9 s). */
  verifyTimeoutMs?: number;
  verifyPollMs?: number;
  /** Time for the verify step; tests pass a fake one. */
  clock?: Clock;
}

export interface Clock {
  now(): number;
  sleep(ms: number): Promise<void>;
}

/** Consecutive missed edits before a guessed settings file counts as not this window's. */
export const MISSES_BEFORE_UNFOLLOWED = 2;
/** Defaults for how long, and how often, a write is checked to have landed. */
const VERIFY_TIMEOUT_MS = 4000;
const VERIFY_POLL_MS = 100;
/** The permission bits of a file mode: rwx for owner, group and others. */
const PERMISSION_BITS = 0o777;

const realClock: Clock = {
  now: () => Date.now(),
  sleep: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
};

/**
 * Writes one of Toucan's two settings, keeping comments when it can (0017).
 * It edits the user settings file in place only when the setting is in the
 * file and matches VS Code's view, and only if VS Code then picks the edit up;
 * otherwise it falls back to `update()`.
 */
export class SettingsFileWriter {
  private readonly files: Record<SettingsTarget, string>;
  private readonly ports: SettingsWritePorts;
  private readonly verifyTimeoutMs: number;
  private readonly verifyPollMs: number;
  private readonly clock: Clock;
  /**
   * The focus coordinator and the commands share this writer, and both
   * settings can live in the same file: one read-plan-write-verify at a time,
   * or one could overwrite the other's edit.
   */
  private readonly lock = createLock();
  /**
   * Guessed (`profile`) files whose in-place edits VS Code missed twice in a
   * row: the guess was another profile's file, so later writes go straight to
   * `update()` instead of waiting out the verify timeout every time.
   */
  private readonly unfollowed = new Set<string>();
  /** Consecutive missed edits per guessed file; one slow pickup isn't enough. */
  private readonly misses = new Map<string, number>();

  constructor(
    files: Record<SettingsTarget, string>,
    ports: SettingsWritePorts,
    options: SettingsWriteOptions = {},
  ) {
    this.files = files;
    this.ports = ports;
    this.verifyTimeoutMs = options.verifyTimeoutMs ?? VERIFY_TIMEOUT_MS;
    this.verifyPollMs = options.verifyPollMs ?? VERIFY_POLL_MS;
    this.clock = options.clock ?? realClock;
  }

  /** The settings file a target resolves to (a guess for `profile`, see 0017). */
  file(target: SettingsTarget): string {
    return this.files[target];
  }

  /**
   * `profile` for this profile's settings (workbench.colorCustomizations);
   * `defaultProfile` for application-scoped ones (toucan.repos), which VS Code
   * keeps in the default profile's file.
   */
  write(key: string, update: SettingsUpdate, target: SettingsTarget): Promise<void> {
    return this.lock(() => this.writeNow(key, update, target));
  }

  private async writeNow(
    key: string,
    update: SettingsUpdate,
    target: SettingsTarget,
  ): Promise<void> {
    // Computed here, inside the lock, from the settings as they are now: a
    // value computed earlier (before a dialog, or while waiting for the lock)
    // could undo another window's change in the meantime.
    const next = update(this.ports.view(key));
    if (next === undefined) {
      return;
    }
    const reason = await this.tryInPlace(target, key, update, next.value);
    if (reason === undefined) {
      return;
    }
    this.ports.debug(`${key}: update() instead of an in-place edit (${reason})`);
    // Recomputed from the view as it is now: the attempt can take seconds
    // (the verify wait), and an older value would undo an edit made meanwhile.
    const latest = update(this.ports.view(key));
    if (latest === undefined) {
      return;
    }
    await this.ports.update(key, latest.value);
  }

  /** Edits the file in place if it safely can. Returns why it couldn't, or `undefined` when it did (or had nothing to do). */
  private async tryInPlace(
    target: SettingsTarget,
    key: string,
    update: SettingsUpdate,
    computed: Record<string, unknown> | undefined,
  ): Promise<string | undefined> {
    const file = this.files[target];
    let desired = computed;
    // Only the guess is ever given up on: both targets can resolve to the same
    // file, and the default profile's settings are always followed there.
    if (target === "profile" && this.unfollowed.has(file)) {
      return "VS Code didn't follow an earlier edit of this file";
    }
    if (await this.isDirty(file)) {
      return "the settings file has unsaved changes";
    }
    let text: string;
    try {
      text = await readFile(file, "utf8");
    } catch {
      return "the settings file can't be read";
    }

    let plan = planEdit({ text, key, view: this.ports.view(key), desired });
    // Re-read right before writing, to narrow the race with VS Code's own writes.
    const latest = await readFile(file, "utf8").catch(() => undefined);
    if (latest !== text) {
      if (latest === undefined) {
        return "the settings file disappeared";
      }
      text = latest;
      // The file moved on, and maybe the view with it: recompute from it.
      const recomputed = update(this.ports.view(key));
      if (recomputed === undefined) {
        return undefined;
      }
      desired = recomputed.value;
      plan = planEdit({ text, key, view: this.ports.view(key), desired });
    }
    if (plan.kind === "noop") {
      return undefined;
    }
    if (plan.kind === "fallback") {
      return plan.reason;
    }

    try {
      await writeLikeVsCode(file, plan.text);
    } catch (error) {
      // E.g. a read-only file, or a rename blocked by another process.
      return `couldn't write the settings file (${String(error)})`;
    }
    if (await this.reflected(key, desired, plan.changed)) {
      this.misses.delete(file);
      return undefined;
    }
    // VS Code didn't follow: maybe slow, maybe not this window's file (0017 step 5).
    const now = await readFile(file, "utf8").catch(() => undefined);
    if (now !== plan.text) {
      // Someone else wrote meanwhile: no evidence either way about the guess.
      return "VS Code didn't pick up the edit, and the file changed since; left it";
    }
    this.recordMiss(target, file);
    try {
      await writeLikeVsCode(file, text);
    } catch (error) {
      return `VS Code didn't pick up the edit, and reverting it failed (${String(error)})`;
    }
    return "VS Code didn't pick up the edit; reverted it";
  }

  /** Only the `profile` file is a guess; the default profile's file is always followed. */
  private recordMiss(target: SettingsTarget, file: string): void {
    if (target !== "profile") {
      return;
    }
    const misses = (this.misses.get(file) ?? 0) + 1;
    this.misses.set(file, misses);
    if (misses >= MISSES_BEFORE_UNFOLLOWED) {
      this.unfollowed.add(file);
    }
  }

  private async reflected(
    key: string,
    desired: Record<string, unknown> | undefined,
    changed: readonly string[],
  ): Promise<boolean> {
    const deadline = this.clock.now() + this.verifyTimeoutMs;
    while (this.clock.now() < deadline) {
      if (viewReflects(this.ports.view(key), desired, changed)) {
        return true;
      }
      // oxlint-disable-next-line no-await-in-loop -- polling is sequential by nature
      await this.clock.sleep(this.verifyPollMs);
    }
    return viewReflects(this.ports.view(key), desired, changed);
  }

  /** Open with unsaved edits, compared by real path (a symlink may be open under its target). */
  private async isDirty(file: string): Promise<boolean> {
    const real = await realpath(file).catch(() => file);
    const paths = await Promise.all(
      this.ports.dirtyFiles().map((path) => realpath(path).catch(() => path)),
    );
    return paths.includes(real);
  }
}

/**
 * Writes like VS Code does for user settings: through a symlink in place, a
 * hard-linked file in place (keeping the link), otherwise a temp file next to
 * it renamed over it, keeping its mode.
 *
 * The in-place write of a linked file truncates first, so a crash mid-write
 * can leave it short. VS Code's own write has the same window, and renaming
 * would replace the link (a symlink) or split it (a hard link), so this
 * accepts that risk as VS Code parity.
 *
 * Why not the stable API (`openTextDocument`, a `WorkspaceEdit`, `save()`)?
 * `save()` saves the whole buffer, including unsaved edits the user has open
 * in settings.json, which Toucan must never do.
 */
async function writeLikeVsCode(file: string, text: string): Promise<void> {
  const link = await lstat(file);
  if (link.isSymbolicLink() || (await stat(file)).nlink > 1) {
    await writeFile(file, text);
    return;
  }
  const temporary = join(dirname(file), `.${randomUUID()}.toucan.tmp`);
  try {
    const mode = link.mode & PERMISSION_BITS;
    // Created with the original's mode, so the copy is never more readable
    // than settings.json; the umask can narrow it, so chmod then sets it exactly.
    await writeFile(temporary, text, { mode });
    await chmod(temporary, mode);
    await rename(temporary, file);
  } catch (error) {
    // Never leave a copy of the user's settings behind.
    await unlink(temporary).catch(() => undefined);
    throw error;
  }
}
