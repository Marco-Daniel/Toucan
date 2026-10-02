import { ConfigurationTarget, workspace } from "vscode";
import type { Log } from "../../core/log.adapter.ts";
import { settingsFiles } from "./settingsEdit.util.ts";
import { SettingsFileWriter } from "./settingsWrite.util.ts";

/** The user-level value of a setting: never get(), which merges defaults and workspace values. */
export function userValue(key: string): unknown {
  return workspace.getConfiguration().inspect(key)?.globalValue;
}

/** Whether this workspace or folder sets its own value for `key`, hiding the user-level one. */
export function overriddenInWorkspace(key: string): boolean {
  const inspected = workspace.getConfiguration().inspect(key);
  return inspected?.workspaceValue !== undefined || inspected?.workspaceFolderValue !== undefined;
}

interface CreateSettingsWriterArgs {
  globalStoragePath: string;
  log: Log;
}

/** The settings writer wired to VS Code (0017). Create one and share it: it holds the lock. */
export function createSettingsWriter({
  globalStoragePath,
  log,
}: CreateSettingsWriterArgs): SettingsFileWriter {
  return new SettingsFileWriter({
    files: settingsFiles(globalStoragePath),
    ports: {
      view: userValue,
      update: async ({ key, value }) => {
        await workspace.getConfiguration().update(key, value, ConfigurationTarget.Global);
      },
      // fsPath, not path: on Windows the path is "/c:/…", which realpath can't resolve.
      dirtyFiles: () =>
        workspace.textDocuments.filter((document) => document.isDirty).map((d) => d.uri.fsPath),
      debug: (message) => log.debug(message),
    },
  });
}

export type SettingsWriter = SettingsFileWriter;
