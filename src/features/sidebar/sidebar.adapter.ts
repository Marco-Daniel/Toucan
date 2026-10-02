import { commands as vscodeCommands, window, workspace } from "vscode";
import type { Disposable, ExtensionContext, WebviewView, WebviewViewProvider } from "vscode";
import { notify } from "../../core/notify.adapter.ts";
import type { Log } from "../../core/log.adapter.ts";
import { deriveColors } from "../../shared/color/derive.util.ts";
import { resolveSidebarSettings, SidebarController } from "./sidebar.util.ts";
import type { SidebarSettings } from "./sidebar.util.ts";
import { sidebarBlockHtml } from "./sidebar.view.ts";
import type { SidebarStyle } from "../../shared/model/model.types.ts";
import { configs } from "../../generated/meta.ts";
import { SIDEBAR_AVAILABLE_CONTEXT, SIDEBAR_VIEW_ID } from "../../core/ids.consts.ts";
import type { ActiveRepo } from "../../core/repo.adapter.ts";
import { writeUserSetting } from "../settings/settings.adapter.ts";

/** workspaceState key for "the user closed the block here" (0013). */
const CLOSED_KEY = "sidebarBlock.closed";

interface SidebarBlockArgs {
  context: ExtensionContext;
  log: Log;
  /** This window's repo, read fresh on every refresh. */
  repo: () => ActiveRepo | undefined;
}

/**
 * The opt-in sidebar block (0006, 0013): renders the repo color in a webview
 * without scripts and lets `SidebarController` decide when it's shown.
 */
export class SidebarBlock implements WebviewViewProvider, Disposable {
  readonly controller: SidebarController;
  private view: WebviewView | undefined;
  private readonly disposables: Disposable[] = [];

  private readonly context: ExtensionContext;
  private readonly log: Log;
  private readonly repo: () => ActiveRepo | undefined;

  constructor({ context, log, repo }: SidebarBlockArgs) {
    this.context = context;
    this.log = log;
    this.repo = repo;
    this.controller = new SidebarController({
      ports: {
        reveal: async () => {
          await vscodeCommands.executeCommand(`${SIDEBAR_VIEW_ID}.focus`, { preserveFocus: true });
        },
        closeBar: async () => {
          await vscodeCommands.executeCommand("workbench.action.closeAuxiliaryBar");
        },
        readClosed: () => context.workspaceState.get<boolean>(CLOSED_KEY, false),
        writeClosed: async (closed) => {
          await context.workspaceState.update(CLOSED_KEY, closed || undefined);
        },
        warn: (message) => log.warn(`[sidebar] ${message}`),
        debug: (message) => log.debug(`[sidebar] ${message}`),
      },
      settings: () => this.settings(),
    });
    this.disposables.push(window.registerWebviewViewProvider(SIDEBAR_VIEW_ID, this));
  }

  resolveWebviewView(view: WebviewView): void {
    this.view = view;
    view.webview.options = { enableScripts: false, localResourceRoots: [] };
    this.render();
    // VS Code can resolve the view again (after a close, a move); these
    // listeners live and die with this instance of it.
    const listeners = [
      view.onDidChangeVisibility(() => this.controller.visibilityChanged(view.visible)),
    ];
    listeners.push(
      view.onDidDispose(() => {
        for (const listener of listeners) {
          listener.dispose();
        }
        if (this.view === view) {
          this.view = undefined;
        }
        this.controller.visibilityChanged(false);
      }),
    );
    this.controller.visibilityChanged(view.visible);
  }

  /** After the repo or a setting changed. */
  async refresh(): Promise<void> {
    const { enabled } = this.settings();
    await vscodeCommands.executeCommand("setContext", SIDEBAR_AVAILABLE_CONTEXT, enabled);
    this.render();
    this.controller.settingsChanged();
  }

  dispose(): void {
    this.controller.dispose();
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }

  private render(): void {
    const repo = this.repo();
    if (!this.view || !repo) {
      return;
    }
    this.view.webview.html = sidebarBlockHtml({
      name: repo.name,
      glyph: repo.config.glyph,
      colors: deriveColors({
        background: repo.config.background,
        overrides: repo.config.overrides,
      }),
      style: this.settings().style,
    });
  }

  /** Enabled means: the setting is on and this repo has a color. */
  private settings(): SidebarSettings & { style: SidebarStyle } {
    const configuration = workspace.getConfiguration();
    return resolveSidebarSettings({
      enabled: configuration.get(configs.sidebarBlockEnabled.key),
      style: configuration.get(configs.sidebarBlockStyle.key),
      visibility: configuration.get(configs.sidebarBlockVisibility.key),
      repo: this.repo()?.config,
    });
  }

  /**
   * Toggle Sidebar Block. Turning the block on writes the boolean with
   * VS Code's own update(): a boolean has no comments inside it to keep, and
   * the settings writer only edits Toucan's object settings (0017).
   */
  async toggle(): Promise<void> {
    if (!this.repo()) {
      notify({ level: "info", message: "Set a Toucan color for this repo first." });
      return;
    }
    if (!workspace.getConfiguration().get(configs.sidebarBlockEnabled.key, false)) {
      const answer = await window.showInformationMessage(
        "The Toucan sidebar block is turned off. Turn it on?",
        "Turn On",
      );
      if (answer === "Turn On") {
        // Forget an earlier close; the settings change then reveals the block.
        await this.context.workspaceState.update(CLOSED_KEY, undefined);
        await writeUserSetting({ key: configs.sidebarBlockEnabled.key, value: true });
        this.log.info("Turned on the sidebar block.");
      }
      return;
    }
    await this.controller.toggle();
  }
}
