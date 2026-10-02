import { commands as vscodeCommands } from "vscode";
import type { Disposable } from "vscode";
import { notify } from "../../core/notify.adapter.ts";
import { commands } from "../../generated/meta.ts";
import type { ActiveRepo } from "../../core/repo.adapter.ts";
import type { SettingsWriter } from "../settings/settings.adapter.ts";
import type { SidebarBlock } from "../sidebar/sidebar.adapter.ts";
import type { StatusBarIndicator } from "../statusBar/statusBar.adapter.ts";
import { clearColor } from "./clearColor.adapter.ts";
import { pickPreset } from "./pickPresetColor.adapter.ts";
import { setColor } from "./setColor.adapter.ts";
import { setGlyph } from "./setGlyph.adapter.ts";

export interface CommandHost {
  /** Writes toucan.repos, keeping comments when it safely can (toucan-v1/0017). */
  writer: SettingsWriter;
  /** This window's repo (first folder) name, configured or not. */
  repoName(): string | undefined;
  /** This window's repo if it has an entry. */
  activeRepo(): ActiveRepo | undefined;
  indicator: StatusBarIndicator;
  sidebar: Pick<SidebarBlock, "toggle">;
}

/** What every repo command gets: the host and this window's repo name. */
export interface CommandArgs {
  host: CommandHost;
  name: string;
}

interface WithRepoArgs {
  host: CommandHost;
  command: (args: CommandArgs) => Promise<void>;
}

/**
 * All five commands. Set Color, Pick Preset Color, Set Glyph and Clear Color
 * write `toucan.repos`; Toggle Sidebar Block belongs to the sidebar block.
 */
export function registerCommands(host: CommandHost): Disposable[] {
  return [
    vscodeCommands.registerCommand(commands.toggleSidebarBlock, () => host.sidebar.toggle()),
    vscodeCommands.registerCommand(commands.setColor, withRepo({ host, command: setColor })),
    vscodeCommands.registerCommand(commands.pickPreset, withRepo({ host, command: pickPreset })),
    vscodeCommands.registerCommand(commands.setGlyph, withRepo({ host, command: setGlyph })),
    vscodeCommands.registerCommand(commands.clearColor, withRepo({ host, command: clearColor })),
  ];
}

/** Runs a command for this window's repo, or explains that a folder is needed. */
function withRepo({ host, command }: WithRepoArgs): () => Promise<void> {
  return async () => {
    const name = host.repoName();
    if (name === undefined) {
      notify({ level: "warning", message: "Toucan colors a repository. Open a folder first." });
      return;
    }
    await command({ host, name });
  };
}
