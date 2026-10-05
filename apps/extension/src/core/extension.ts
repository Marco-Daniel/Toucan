// import vscode
import { window, workspace } from "vscode";

// import adapters
import { AgentsControlOffer } from "../features/agentsControl/agentsControl.adapter.ts";
import { registerCommands } from "../features/commands/commands.adapter.ts";
import { COLOR_CUSTOMIZATIONS, startFocusCoordinator } from "../features/focus/focus.adapter.ts";
import { createLog } from "./log.adapter.ts";
import { resolveActiveRepo } from "./repo.adapter.ts";
import { SearchEmoji } from "../features/searchEmoji/searchEmoji.adapter.ts";
import { createSettingsWriter } from "../features/settings/settings.adapter.ts";
import { SidebarBlock } from "../features/sidebar/sidebar.adapter.ts";
import { StatusBarIndicator } from "../features/statusBar/statusBar.adapter.ts";

// import utils
import { deriveColors } from "../shared/color/derive.util.ts";
import { IssueReporter } from "../shared/config/issues.util.ts";
import { tryCatch } from "../shared/async/tryCatch.util.ts";
import { logFailure } from "../shared/async/logFailure.util.ts";

// import consts
import { configs } from "../generated/meta.ts";

// import types
import type { ExtensionContext } from "vscode";
import type { FocusCoordinator } from "../features/focus/focus.util.ts";
import type { ActiveRepo } from "./repo.adapter.ts";

let coordinator: FocusCoordinator | undefined;

interface BackgroundArgs {
  /** Named in the warning when the task fails. */
  what: string;
  task: Promise<unknown>;
}

export async function activate(context: ExtensionContext): Promise<void> {
  const log = createLog();
  /** Fire-and-forget work: a failure is logged instead of becoming an unhandled rejection. */
  const background = ({ what, task }: BackgroundArgs) => {
    // A .catch, not tryCatch: nothing here awaits, the task runs on by itself.
    task.catch((error: unknown) => logFailure({ log, what, error }));
  };
  const reporter = new IssueReporter({ log, setting: configs.repos.key });
  const indicator = new StatusBarIndicator();
  let repo: ActiveRepo | undefined;

  const writer = createSettingsWriter({ globalStoragePath: context.globalStorageUri.fsPath, log });
  const focus = startFocusCoordinator({
    context,
    log,
    writer,
    desired: () =>
      repo
        ? deriveColors({ background: repo.config.background, overrides: repo.config.overrides })
        : undefined,
  });
  coordinator = focus;

  const sidebar = new SidebarBlock({ context, log, repo: () => repo });
  const agentsControl = new AgentsControlOffer({ context, log });
  const searchEmoji = new SearchEmoji({ context, log, repo: () => repo });
  // Only a window that colors the Command Center asks (toucan-v1/0016).
  const offerAgentsControl = (focused: boolean) => {
    if (focused && repo) {
      background({ what: "The Agents control offer", task: agentsControl.check() });
    }
  };

  const refresh = () => {
    repo = resolveActiveRepo(reporter);
    indicator.update(repo);
    // Only the focused window writes; see FocusCoordinator.refresh.
    focus.refresh();
    background({ what: "Sidebar block refresh", task: sidebar.refresh() });
    // A repo can get its first color mid-session (Set Color), not only at startup.
    offerAgentsControl(window.state.focused);
    background({ what: "Search emoji refresh", task: searchEmoji.refresh() });
  };

  context.subscriptions.push(
    log,
    indicator,
    sidebar,
    searchEmoji,
    // The one window-state listener; each part reacts to focus changes.
    window.onDidChangeWindowState(({ focused }) => {
      focus.setFocused(focused);
      offerAgentsControl(focused);
      background({ what: "Search emoji refresh", task: searchEmoji.focusChanged(focused) });
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
      if (affects(configs.sidebarBlockEnabled.key) || affects(configs.sidebarBlockStyle.key)) {
        background({ what: "Sidebar block refresh", task: sidebar.refresh() });
      }
      if (affects(configs.experimentalSearchEmoji.key)) {
        background({ what: "Search emoji refresh", task: searchEmoji.refresh() });
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
  // The view's `when` context keys must be set at startup, or the view appears in the wrong state.
  const [, sidebarError] = await tryCatch(() => sidebar.refresh());
  if (sidebarError !== null) {
    // Keep the rest of Toucan running if the sidebar's context key fails.
    logFailure({ log, what: "Sidebar block setup", error: sidebarError });
  }
  offerAgentsControl(window.state.focused);
}

export async function deactivate(): Promise<void> {
  await coordinator?.dispose();
  coordinator = undefined;
}
