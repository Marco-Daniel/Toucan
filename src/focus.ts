import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { window, type Disposable, type ExtensionContext, type LogOutputChannel } from "vscode";
import { FocusCoordinator, type FocusPorts } from "./core/focus.ts";
import { settingInText } from "./core/settingsEdit.ts";
import { userValue, type SettingsWriter } from "./settingsWriter.ts";
import type { CommandCenterColors } from "./core/model.ts";

export const COLOR_CUSTOMIZATIONS = "workbench.colorCustomizations";

/**
 * Wires the focus coordinator to VS Code: window focus events, the owner file
 * in global storage (shared by all local windows, since Toucan is a UI
 * extension) and the user-level color customizations. The caller feeds the
 * initial focus state once its repo is resolved.
 */
export function startFocusCoordinator(
  context: ExtensionContext,
  log: LogOutputChannel,
  writer: SettingsWriter,
  desired: () => CommandCenterColors | undefined,
): { coordinator: FocusCoordinator; disposable: Disposable } {
  const id = randomUUID();
  const coordinator = new FocusCoordinator(id, ownerFilePorts(context, id, log, writer), desired);
  const disposable = window.onDidChangeWindowState((state) => {
    coordinator.setFocused(state.focused);
  });
  return { coordinator, disposable };
}

function ownerFilePorts(
  context: ExtensionContext,
  id: string,
  log: LogOutputChannel,
  writer: SettingsWriter,
): FocusPorts {
  const directory = context.globalStorageUri.fsPath;
  const ownerFile = join(directory, "owner.json");
  // A guess: a profile can share the default global state and keep its own
  // settings (or the reverse), so this may be the wrong file. See
  // readCustomizationsFromDisk.
  const settingsFile = writer.file("profile");

  return {
    async readOwner() {
      try {
        const { window: owner } = JSON.parse(await readFile(ownerFile, "utf8")) as {
          window?: unknown;
        };
        return typeof owner === "string" ? owner : undefined;
      } catch {
        // Missing or unreadable counts as another window's, so nothing is cleared.
        return undefined;
      }
    },
    async writeOwner(owner) {
      await mkdir(directory, { recursive: true });
      // Write then rename, so a reader never sees a half-written file.
      const temporary = join(directory, `owner.${id}.tmp`);
      await writeFile(temporary, JSON.stringify({ window: owner, at: Date.now() }));
      await rename(temporary, ownerFile);
    },
    readCustomizations() {
      return userValue(COLOR_CUSTOMIZATIONS);
    },
    async readCustomizationsFromDisk() {
      // A guess at this window's settings file, only used to notice a stale
      // view. It can be another profile's file, so it's never written back.
      const text = await readFile(settingsFile, "utf8").catch(() => undefined);
      return text === undefined ? undefined : settingInText(text, COLOR_CUSTOMIZATIONS);
    },
    async writeCustomizations(update) {
      // Run inside the writer's lock; keeps comments when it safely can (0017).
      await writer.write(COLOR_CUSTOMIZATIONS, update, "profile");
    },
    warn(message) {
      safeLog(() => log.warn(message));
    },
    debug(message) {
      safeLog(() => log.debug(`[${id.slice(0, 8)}] ${message}`));
    },
  };
}

/**
 * During shutdown the output channel can already be closed when deactivate's
 * best-effort clear runs; logging then throws, which must not fail deactivate.
 */
function safeLog(write: () => void): void {
  try {
    write();
  } catch {
    // The channel is gone; there's nobody left to read the message.
  }
}
