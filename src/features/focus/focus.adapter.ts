import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { ExtensionContext } from "vscode";
import type { Log } from "../../core/log.adapter.ts";
import { FocusCoordinator } from "./focus.util.ts";
import type { FocusPorts } from "./focus.util.ts";
import { createOwnerFile } from "./ownerFile.util.ts";
import { settingInText } from "../settings/settingsEdit.util.ts";
import { userValue } from "../settings/settings.adapter.ts";
import type { SettingsWriter } from "../settings/settings.adapter.ts";
import type { CommandCenterColors } from "../../shared/model/model.types.ts";
import { tryCatch } from "../../shared/async/tryCatch.util.ts";

export const COLOR_CUSTOMIZATIONS = "workbench.colorCustomizations";
/** globalState (per profile): Toucan has applied a color here at least once (0008). */
const APPLIED_KEY = "commandCenter.applied";
/** Debug lines name the window by the start of its id. */
const SHORT_ID_LENGTH = 8;

interface StartFocusCoordinatorArgs {
  context: ExtensionContext;
  log: Log;
  writer: SettingsWriter;
  /** This window's colors, or `undefined` for an unconfigured repo. */
  desired: () => CommandCenterColors | undefined;
}

/**
 * Wires the focus coordinator to VS Code: the owner file in global storage
 * (shared by all local windows, since Toucan is a UI extension) and the
 * user-level color customizations. The caller feeds it focus changes,
 * starting with the initial state once its repo is resolved.
 */
export function startFocusCoordinator({
  context,
  log,
  writer,
  desired,
}: StartFocusCoordinatorArgs): FocusCoordinator {
  const id = randomUUID();
  return new FocusCoordinator({ id, ports: ownerFilePorts({ context, id, log, writer }), desired });
}

interface OwnerFilePortsArgs {
  context: ExtensionContext;
  /** This window's id. */
  id: string;
  log: Log;
  writer: SettingsWriter;
}

function ownerFilePorts({ context, id, log, writer }: OwnerFilePortsArgs): FocusPorts {
  // A guess: a profile can share the default global state and keep its own
  // settings (or the reverse), so this may be the wrong file. See
  // readCustomizationsFromDisk.
  const settingsFile = writer.file("profile");

  return {
    ...createOwnerFile({ directory: context.globalStorageUri.fsPath, id }),
    readCustomizations() {
      return userValue(COLOR_CUSTOMIZATIONS);
    },
    async readCustomizationsFromDisk() {
      // A guess at this window's settings file, only used to notice a stale
      // view. It can be another profile's file, so it's never written back.
      const [text] = await tryCatch(() => readFile(settingsFile, "utf8"));
      return text === null ? undefined : settingInText(text, COLOR_CUSTOMIZATIONS);
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
