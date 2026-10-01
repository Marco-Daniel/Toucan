import { randomUUID } from "node:crypto";
import { chmod, lstat, readFile, realpath, rename, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createLock } from "./lock.ts";
import { planEdit, viewReflects } from "./settingsEdit.ts";

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
}

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
  /**
   * The focus coordinator and the commands share this writer, and both
   * settings can live in the same file: one read-plan-write-verify at a time,
   * or one could overwrite the other's edit.
   */
  private readonly lock = createLock();

  constructor(
    files: Record<SettingsTarget, string>,
    ports: SettingsWritePorts,
    options: SettingsWriteOptions = {},
  ) {
    this.files = files;
    this.ports = ports;
    this.verifyTimeoutMs = options.verifyTimeoutMs ?? 4000;
    this.verifyPollMs = options.verifyPollMs ?? 100;
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
    const outcome = await this.tryInPlace(this.files[target], key, update, next.value);
    if (outcome.reason === undefined) {
      return;
    }
    this.ports.debug(`${key}: update() instead of an in-place edit (${outcome.reason})`);
    await this.ports.update(key, outcome.desired);
  }

  /**
   * Edits the file in place if it safely can. Returns why it couldn't (or
   * `undefined` when it did), with the latest value the fallback should write.
   */
  private async tryInPlace(
    file: string,
    key: string,
    update: SettingsUpdate,
    computed: Record<string, unknown> | undefined,
  ): Promise<{ reason: string | undefined; desired: Record<string, unknown> | undefined }> {
    let desired = computed;
    const fallback = (reason: string) => ({ reason, desired });
    if (await this.isDirty(file)) {
      return fallback("the settings file has unsaved changes");
    }
    let text: string;
    try {
      text = await readFile(file, "utf8");
    } catch {
      return fallback("the settings file can't be read");
    }

    let plan = planEdit({ text, key, view: this.ports.view(key), desired });
    // Re-read right before writing, to narrow the race with VS Code's own writes.
    const latest = await readFile(file, "utf8").catch(() => undefined);
    if (latest !== text) {
      if (latest === undefined) {
        return fallback("the settings file disappeared");
      }
      text = latest;
      // The file moved on, and maybe the view with it: recompute from it.
      const recomputed = update(this.ports.view(key));
      if (recomputed === undefined) {
        return { reason: undefined, desired };
      }
      desired = recomputed.value;
      plan = planEdit({ text, key, view: this.ports.view(key), desired });
    }
    if (plan.kind === "noop") {
      return { reason: undefined, desired };
    }
    if (plan.kind === "fallback") {
      return fallback(plan.reason);
    }

    await writeLikeVsCode(file, plan.text);
    if (await this.reflected(key, desired, plan.changed)) {
      return { reason: undefined, desired };
    }
    // VS Code didn't follow: the file wasn't this window's (0017 step 5).
    const now = await readFile(file, "utf8").catch(() => undefined);
    if (now === plan.text) {
      await writeLikeVsCode(file, text);
      return fallback("VS Code didn't pick up the edit; reverted it");
    }
    return fallback("VS Code didn't pick up the edit, and the file changed since; left it");
  }

  private async reflected(
    key: string,
    desired: Record<string, unknown> | undefined,
    changed: readonly string[],
  ): Promise<boolean> {
    const deadline = Date.now() + this.verifyTimeoutMs;
    while (Date.now() < deadline) {
      if (viewReflects(this.ports.view(key), desired, changed)) {
        return true;
      }
      // oxlint-disable-next-line no-await-in-loop -- polling is sequential by nature
      await new Promise((resolve) => setTimeout(resolve, this.verifyPollMs));
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
 */
async function writeLikeVsCode(file: string, text: string): Promise<void> {
  const link = await lstat(file);
  if (link.isSymbolicLink() || (await stat(file)).nlink > 1) {
    await writeFile(file, text);
    return;
  }
  const temporary = join(dirname(file), `.${randomUUID()}.toucan.tmp`);
  await writeFile(temporary, text);
  // writeFile's mode is masked by the umask; chmod sets it exactly.
  await chmod(temporary, link.mode & 0o777);
  await rename(temporary, file);
}
