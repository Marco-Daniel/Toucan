// import vscode
import { commands as vscodeCommands, window, workspace } from "vscode";

// import adapters
import { notify } from "../../core/notify.adapter.ts";
import { writeUserSetting } from "../settings/settings.adapter.ts";

// import utils
import { deriveColors } from "../../shared/color/derive.util.ts";
import { resolveSidebarSettings, SidebarController } from "./sidebar.util.ts";

// import views
import { sidebarBlockHtml } from "./sidebar.view.ts";

// import consts
import { configs } from "../../generated/meta.ts";
import {
  SIDEBAR_AVAILABLE_CONTEXT,
  SIDEBAR_SHOWN_CONTEXT,
  SIDEBAR_VIEW_ID,
} from "../../core/ids.consts.ts";

// import types
import type { Disposable, ExtensionContext, WebviewView, WebviewViewProvider } from "vscode";
import type { Log } from "../../core/log.adapter.ts";
import type { SidebarSettings } from "./sidebar.util.ts";
import type { SidebarStyle } from "../../shared/model/model.types.ts";
import type { ActiveRepo } from "../../core/repo.adapter.ts";

/**
 * workspaceState key for "the user hid the block here" (sidebar-explorer/0006, 0007). A new key:
 * 1.0.0's `sidebarBlock.closed` also meant a switch of the secondary sidebar to another view, which
 * isn't a hide in the Explorer, so an old value must not carry over.
 */
const HIDDEN_KEY = "sidebarBlock.hidden";

interface SidebarBlockArgs {
  context: ExtensionContext;
  log: Log;
  /** This window's repo, read fresh on every refresh. */
  repo: () => ActiveRepo | undefined;
}

/**
 * The opt-in sidebar block in the Explorer (sidebar-explorer/0001, sidebar-explorer/0006):
 * renders the repo color in a webview without scripts and lets `SidebarController`
 * decide when it's shown.
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
        setShown: async (shown) => {
          await vscodeCommands.executeCommand("setContext", SIDEBAR_SHOWN_CONTEXT, shown);
        },
        readClosed: () => context.workspaceState.get<boolean>(HIDDEN_KEY, false),
        isFocused: () => window.state.focused,
        writeClosed: async (closed) => {
          await context.workspaceState.update(HIDDEN_KEY, closed || undefined);
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
    // VS Code can resolve the view again (after a Hide, a move); these
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
        this.controller.viewDisposed();
      }),
    );
    this.controller.viewResolved(view.visible);
  }

  /**
   * After the repo or a setting changed: sets the context keys of the view's
   * `when` clause and renders.
   */
  async refresh(): Promise<void> {
    const { enabled } = this.settings();
    await vscodeCommands.executeCommand("setContext", SIDEBAR_AVAILABLE_CONTEXT, enabled);
    await vscodeCommands.executeCommand(
      "setContext",
      SIDEBAR_SHOWN_CONTEXT,
      !this.context.workspaceState.get<boolean>(HIDDEN_KEY, false),
    );
    this.render();
  }

  /**
   * After a change to the enabled setting or the style: the context keys first,
   * so the view exists when the controller reveals a block that was turned on.
   */
  async settingsChanged(): Promise<void> {
    await this.refresh();
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
      repo: this.repo()?.config,
    });
  }

  /**
   * Toggle Sidebar Block. Turning the block on writes the boolean with
   * VS Code's own update(): a boolean has no comments inside it to keep, and
   * the settings writer only edits Toucan's object settings (toucan-v1/0017).
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
        // Forget an earlier hide; the view then appears with the setting.
        await this.context.workspaceState.update(HIDDEN_KEY, undefined);
        await writeUserSetting({ key: configs.sidebarBlockEnabled.key, value: true });
        this.log.info("Turned on the sidebar block.");
      }
      return;
    }
    await this.controller.toggle();
  }
}
