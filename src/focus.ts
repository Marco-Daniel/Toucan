import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { ExtensionContext } from "vscode";
import type { Log } from "./log.ts";
import { FocusCoordinator, type FocusPorts } from "./core/focus.ts";
import { createOwnerFile } from "./core/ownerFile.ts";
import { settingInText } from "./core/settingsEdit.ts";
import { userValue, type SettingsWriter } from "./settingsWriter.ts";
import type { CommandCenterColors } from "./core/model.ts";

export const COLOR_CUSTOMIZATIONS = "workbench.colorCustomizations";
/** globalState (per profile): Toucan has applied a color here at least once (0008). */
const APPLIED_KEY = "commandCenter.applied";
/** Debug lines name the window by the start of its id. */
const SHORT_ID_LENGTH = 8;

/**
 * Wires the focus coordinator to VS Code: the owner file in global storage
 * (shared by all local windows, since Toucan is a UI extension) and the
 * user-level color customizations. The caller feeds it focus changes,
 * starting with the initial state once its repo is resolved.
 */
export function startFocusCoordinator(
  context: ExtensionContext,
  log: Log,
  writer: SettingsWriter,
  desired: () => CommandCenterColors | undefined,
): FocusCoordinator {
  const id = randomUUID();
  return new FocusCoordinator(id, ownerFilePorts(context, id, log, writer), desired);
}

function ownerFilePorts(
  context: ExtensionContext,
  id: string,
  log: Log,
  writer: SettingsWriter,
): FocusPorts {
  // A guess: a profile can share the default global state and keep its own
  // settings (or the reverse), so this may be the wrong file. See
  // readCustomizationsFromDisk.
  const settingsFile = writer.file("profile");

  return {
    ...createOwnerFile(context.globalStorageUri.fsPath, id),
    readCustomizations() {
      return userValue(COLOR_CUSTOMIZATIONS);
    },
    async readCustomizationsFromDisk() {
      // A guess at this window's settings file, only used to notice a stale
      // view. It can be another profile's file, so it's never written back.
      const text = await readFile(settingsFile, "utf8").catch(() => undefined);
      return text === undefined ? undefined : settingInText(text, COLOR_CUSTOMIZATIONS);
    },
    hasApplied() {
      return context.globalState.get<boolean>(APPLIED_KEY, false);
    },
    async markApplied() {
      await context.globalState.update(APPLIED_KEY, true);
    },
    async writeCustomizations(update) {
      // Run inside the writer's lock; keeps comments when it safely can (0017).
      await writer.write(COLOR_CUSTOMIZATIONS, update, "profile");
    },
    warn(message) {
      log.warn(message);
    },
    debug(message) {
      log.debug(`[${id.slice(0, SHORT_ID_LENGTH)}] ${message}`);
    },
  };
}
