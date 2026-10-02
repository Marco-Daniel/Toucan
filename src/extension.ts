import { window, workspace } from "vscode";
import type { ExtensionContext } from "vscode";
import { AgentsControlOffer } from "./agentsControl.ts";
import { registerCommands } from "./commands.ts";
import { deriveColors } from "./core/derive.ts";
import type { FocusCoordinator } from "./core/focus.ts";
import { IssueReporter } from "./core/issues.ts";
import { COLOR_CUSTOMIZATIONS, startFocusCoordinator } from "./focus.ts";
import { configs } from "./generated/meta.ts";
import { createLog } from "./log.ts";
import { resolveActiveRepo } from "./repo.ts";
import type { ActiveRepo } from "./repo.ts";
import { SearchEmoji } from "./searchEmoji.ts";
import { createSettingsWriter } from "./settingsWriter.ts";
import { SidebarBlock } from "./sidebar.ts";
import { StatusBarIndicator } from "./statusBar.ts";

let coordinator: FocusCoordinator | undefined;

export async function activate(context: ExtensionContext): Promise<void> {
  const log = createLog();
  /** Fire-and-forget work: a failure is logged instead of becoming an unhandled rejection. */
  const background = (what: string, task: Promise<unknown>) => {
    task.catch((error: unknown) => log.warn(`${what} failed: ${String(error)}`));
  };
  const reporter = new IssueReporter(log, configs.repos.key);
  const indicator = new StatusBarIndicator();
  let repo: ActiveRepo | undefined;

  const writer = createSettingsWriter(context.globalStorageUri.fsPath, log);
  const focus = startFocusCoordinator(context, log, writer, () =>
    repo ? deriveColors(repo.config.background, repo.config.overrides) : undefined,
  );
  coordinator = focus;

  const sidebar = new SidebarBlock(context, log, () => repo);
  const agentsControl = new AgentsControlOffer(context, log);
  const searchEmoji = new SearchEmoji(context, log, () => repo);
  // Only a window that colors the Command Center asks (toucan-v1/0016).
  const offerAgentsControl = (focused: boolean) => {
    if (focused && repo) {
      background("The Agents control offer", agentsControl.check());
    }
  };

  const refresh = () => {
    repo = resolveActiveRepo(reporter);
    indicator.update(repo);
    // Only the focused window writes; see FocusCoordinator.refresh.
    focus.refresh();
    background("Sidebar block refresh", sidebar.refresh());
    // A repo can get its first color mid-session (Set Color), not only at startup.
    offerAgentsControl(window.state.focused);
    background("Search emoji refresh", searchEmoji.refresh());
  };

  context.subscriptions.push(
    log,
    indicator,
    sidebar,
    searchEmoji,
    // The one window-state listener; each part reacts to focus changes.
    window.onDidChangeWindowState(({ focused }) => {
      focus.setFocused(focused);
      sidebar.controller.setFocused(focused);
      offerAgentsControl(focused);
      background("Search emoji refresh", searchEmoji.focusChanged(focused));
    }),
    ...registerCommands({
      writer,
      repoName: () => workspace.workspaceFolders?.[0]?.name,
      activeRepo: () => repo,
      indicator,
      sidebar,
    }),
    workspace.onDidChangeConfiguration((event) => {
      // Independent checks: one event can touch several of these.
      const affects = (key: string) => event.affectsConfiguration(key);
      if (affects(configs.repos.key)) {
        refresh();
      }
      if (
        affects(configs.sidebarBlockEnabled.key) ||
        affects(configs.sidebarBlockStyle.key) ||
        affects(configs.sidebarBlockVisibility.key)
      ) {
        background("Sidebar block refresh", sidebar.refresh());
      }
      if (affects(configs.experimentalSearchEmoji.key)) {
        background("Search emoji refresh", searchEmoji.refresh());
      }
      if (affects(COLOR_CUSTOMIZATIONS)) {
        focus.customizationsChanged();
      }
    }),
    workspace.onDidChangeWorkspaceFolders(refresh),
  );
  refresh();
  // No event fires for the initial state; a window that starts focused also
  // clears leftovers from crashed windows here.
  focus.setFocused(window.state.focused);
  // The view's `when` context key must be set before the first reveal, or the
  // reveal can reach the workbench before the view exists.
  try {
    await sidebar.refresh();
  } catch (error) {
    // Keep the rest of Toucan running if the sidebar's context key fails.
    log.warn(`Sidebar block setup failed: ${String(error)}`);
  }
  sidebar.controller.start(window.state.focused);
  offerAgentsControl(window.state.focused);
}

export async function deactivate(): Promise<void> {
  await coordinator?.dispose();
  coordinator = undefined;
}
