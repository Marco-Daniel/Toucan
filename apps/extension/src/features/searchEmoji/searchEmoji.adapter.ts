// import vscode
import { commands as vscodeCommands, window, workspace } from "vscode";

// import adapters
import { notify } from "../../core/notify.adapter.ts";
import { overriddenInWorkspace, writeUserSetting } from "../settings/settings.adapter.ts";

// import utils
import { emojiFor } from "./emoji.util.ts";
import { EmojiLabel } from "./emojiLabel.util.ts";
import { TitleSetup } from "./titleSetup.util.ts";
import { EMOJI_VARIABLE, shouldLabel } from "./windowTitle.util.ts";
import { createTimer } from "../../shared/async/timer.util.ts";
import { logFailure } from "../../shared/async/logFailure.util.ts";

// import consts
import { configs } from "../../generated/meta.ts";

// import messages
import { titleChangeFailed } from "../../shared/messages/notifications.messages.ts";

// import types
import type { Disposable, ExtensionContext } from "vscode";
import type { Log } from "../../core/log.adapter.ts";
import type { EmojiLabelPorts } from "./emojiLabel.util.ts";
import type { TitlePorts } from "./titleSetup.util.ts";
import type { TitleChange } from "./windowTitle.util.ts";
import type { ActiveRepo } from "../../core/repo.adapter.ts";

const WINDOW_TITLE = "window.title";
/** globalState: what Toucan changed in window.title (toucan-v1/0015). */
const CHANGE_KEY = "searchEmoji.titleChange";
/** Editor and tab events come in bursts; settle on the last one. */
const REASSERT_DELAY_MS = 50;

interface SearchEmojiArgs {
  context: ExtensionContext;
  log: Log;
  repo: () => ActiveRepo | undefined;
}

/**
 * The experimental emoji in the Command Center label (toucan-v1/0007, toucan-v1/0015). It
 * needs Toucan's own variables in the global window.title, which Toucan only
 * adds after asking, and restores when the feature is turned off. Then it sets
 * them per window (see `EmojiLabel`), moving the emoji as editors open and
 * close.
 */
export class SearchEmoji implements Disposable {
  private readonly disposables: Disposable[] = [];
  /** Whether the workspace's own window.title was logged, so it's logged once per change. */
  private reportedOverride = false;
  private readonly timer = createTimer();

  private readonly context: ExtensionContext;
  private readonly log: Log;
  private readonly repo: () => ActiveRepo | undefined;
  private readonly title: TitleSetup;
  private readonly label: EmojiLabel;

  constructor({ context, log, repo }: SearchEmojiArgs) {
    this.context = context;
    this.log = log;
    this.repo = repo;
    this.title = new TitleSetup(titlePorts({ context, log }));
    this.label = new EmojiLabel(labelPorts(log));
    // The emoji moves when the last editor closes or the first opens (see `titleValues`).
    this.disposables.push(
      window.onDidChangeActiveTextEditor(() => this.reassertSoon()),
      window.tabGroups.onDidChangeTabs(() => this.reassertSoon()),
      window.tabGroups.onDidChangeTabGroups(() => this.reassertSoon()),
    );
  }

  /** On every window focus change; returns the refresh a focused window runs. */
  async focusChanged(focused: boolean): Promise<void> {
    this.reassertSoon();
    // A pending consent or restore waits for a focused window.
    if (focused) {
      await this.refresh();
    }
  }

  /** After activation, a focus change or a `toucan.*` change. */
  async refresh(): Promise<void> {
    const change = await this.title.settle();
    if (shouldLabel({ enabled: enabled(), change })) {
      const overridden = overriddenInWorkspace(WINDOW_TITLE);
      if (overridden && !this.reportedOverride) {
        this.log.info(
          `This workspace sets its own ${WINDOW_TITLE}, so the search emoji doesn't show here.`,
        );
      }
      this.reportedOverride = overridden;
      await this.assert();
    } else {
      await this.label.clear();
    }
  }

  dispose(): void {
    this.timer.cancel();
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }

  /** Sets the variables' values; see `EmojiLabel` and `titleValues`. */
  private async assert(): Promise<void> {
    const change = this.context.globalState.get<TitleChange>(CHANGE_KEY);
    if (!change) {
      return;
    }
    const repo = this.repo();
    await this.label.apply({
      repo: repo && { emoji: emojiFor({ hex: repo.config.background, glyph: repo.config.glyph }) },
      // VS Code's `${activeEditorShort}` is the active editor's title, empty without one.
      hasEditor: window.tabGroups.activeTabGroup.activeTab !== undefined,
      hasSlot: (workspace.getConfiguration().get<string>(WINDOW_TITLE) ?? "").includes(
        EMOJI_VARIABLE,
      ),
    });
  }

  private reassertSoon(): void {
    if (!enabled()) {
      return;
    }
    this.timer.start({
      ms: REASSERT_DELAY_MS,
      run: () => {
        // A .catch, not tryCatch: a timer has no caller to await the assert.
        this.assert().catch((error: unknown) => {
          logFailure({ log: this.log, what: "Setting the search emoji", error });
        });
      },
    });
  }
}

function enabled(): boolean {
  return workspace.getConfiguration().get(configs.experimentalSearchEmoji.key, false);
}

/**
 * The title variables' ports. `registerWindowTitleVariable` registers a
 * variable backed by a context key. It's an internal command, not public API,
 * so under ADR-0003 it may only serve this opt-in experimental feature:
 * `EmojiLabel` only registers from `assert`, which only runs while the emoji
 * is on and consented.
 */
function labelPorts(log: Log): EmojiLabelPorts {
  return {
    register: async (name, contextKey) => {
      await vscodeCommands.executeCommand("registerWindowTitleVariable", name, contextKey);
    },
    setContext: async (key, value) => {
      await vscodeCommands.executeCommand("setContext", key, value);
    },
    warn: (message) => log.warn(message),
  };
}

interface TitlePortsArgs {
  context: ExtensionContext;
  log: Log;
}

function titlePorts({ context, log }: TitlePortsArgs): TitlePorts {
  return {
    enabled,
    focused: () => window.state.focused,
    now: () => Date.now(),
    title: () => {
      const inspected = workspace.getConfiguration().inspect<string>(WINDOW_TITLE);
      return {
        global: inspected?.globalValue,
        default: inspected?.defaultValue,
        overridden: overriddenInWorkspace(WINDOW_TITLE),
      };
    },
    readChange: () => context.globalState.get<TitleChange>(CHANGE_KEY),
    writeChange: async (change) => {
      await context.globalState.update(CHANGE_KEY, change);
    },
    writeTitle: async (value) => {
      await writeUserSetting({ key: WINDOW_TITLE, value });
    },
    disable: async () => {
      await writeUserSetting({ key: configs.experimentalSearchEmoji.key, value: false });
    },
    ask: async (overridden) => {
      const answer = await window.showInformationMessage(
        "Show the repo's emoji in the search bar?",
        {
          modal: true,
          detail: `Toucan's experimental search emoji needs its own variables in window.title, so it changes that setting in your user settings. Turning the emoji off restores your previous title.${
            overridden
              ? " This workspace sets its own window.title, so the emoji won't show in this window."
              : ""
          }`,
        },
        "Change Window Title",
      );
      return answer === "Change Window Title";
    },
    info: (message) => log.info(message),
    failed: (error) => {
      log.warn(titleChangeFailed(error));
      notify({ level: "warning", message: titleChangeFailed(error) });
    },
  };
}
