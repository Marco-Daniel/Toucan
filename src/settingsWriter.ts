import { ConfigurationTarget, workspace } from "vscode";
import type { Log } from "./log.ts";
import { settingsFiles } from "./core/settingsEdit.ts";
import { SettingsFileWriter } from "./core/settingsWrite.ts";

export type { SettingsTarget, SettingsUpdate } from "./core/settingsWrite.ts";

/** The user-level value of a setting: never get(), which merges defaults and workspace values. */
export function userValue(key: string): unknown {
  return workspace.getConfiguration().inspect(key)?.globalValue;
}

/** The settings writer wired to VS Code (toucan-v1/0017). Create one and share it: it holds the lock. */
export function createSettingsWriter(globalStoragePath: string, log: Log): SettingsFileWriter {
  return new SettingsFileWriter(settingsFiles(globalStoragePath), {
    view: userValue,
    update: async (key, value) => {
      await workspace.getConfiguration().update(key, value, ConfigurationTarget.Global);
    },
    // fsPath, not path: on Windows the path is "/c:/…", which realpath can't resolve.
    dirtyFiles: () =>
      workspace.textDocuments.filter((document) => document.isDirty).map((d) => d.uri.fsPath),
    debug: (message) => log.debug(message),
  });
}

export type SettingsWriter = SettingsFileWriter;
