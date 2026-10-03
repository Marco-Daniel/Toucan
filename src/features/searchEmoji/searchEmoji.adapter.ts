// import vscode
import { commands as vscodeCommands, extensions, window, workspace } from "vscode";

// import adapters
import { notify } from "../../core/notify.adapter.ts";
import { overriddenInWorkspace, writeUserSetting } from "../settings/settings.adapter.ts";

// import utils
import { emojiFor } from "./emoji.util.ts";
import { TitleSetup } from "./titleSetup.util.ts";
import { EMOJI_VARIABLE_NAME, shouldLabel, titleValues } from "./windowTitle.util.ts";
import { errorText, tryCatch } from "../../shared/async/tryCatch.util.ts";
import { createTimer } from "../../shared/async/timer.util.ts";
import { logFailure } from "../../shared/async/logFailure.util.ts";

// import consts
import { configs } from "../../generated/meta.ts";

// import messages
import { titleChangeFailed } from "../../shared/messages/notifications.messages.ts";

// import types
import type { Disposable, Event, ExtensionContext } from "vscode";
import type { Log } from "../../core/log.adapter.ts";
import type { TitlePorts } from "./titleSetup.util.ts";
import type { TitleChange } from "./windowTitle.util.ts";
import type { ActiveRepo } from "../../core/repo.adapter.ts";

const WINDOW_TITLE = "window.title";
/** The per-window context key behind `${activeRepositoryName}` (internal to VS Code). */
const REPO_NAME_CONTEXT = "scmActiveRepositoryName";
/** Toucan's own context key behind `${toucanRepoEmoji}` (toucan-v1/0007). */
const EMOJI_CONTEXT = "toucan.repoEmoji";
/** globalState: what Toucan changed in window.title (toucan-v1/0015). */
const CHANGE_KEY = "searchEmoji.titleChange";
/** SCM rewrites the key after its own events; reassert just after them. */
const REASSERT_DELAY_MS = 50;

/** The slice of the built-in git extension's API this uses. */
interface GitApi {
  repositories: { state: { onDidChange: Event<void> } }[];
  onDidOpenRepository: Event<{ state: { onDidChange: Event<void> } }>;
  onDidCloseRepository: Event<unknown>;
}

interface SearchEmojiArgs {
  context: ExtensionContext;
  log: Log;
  repo: () => ActiveRepo | undefined;
}

/**
 * The experimental emoji in the Command Center label (toucan-v1/0007, toucan-v1/0015). It needs
 * `${activeRepositoryName}` in the global window.title, which Toucan only
 * adds after asking (with its own `${toucanRepoEmoji}` before the folder
 * name), and restores when the feature is turned off. Then it overwrites the
 * internal `scmActiveRepositoryName` context key and sets its own
 * `toucan.repoEmoji` (see `titleValues`), reasserting them after SCM, editor,
 * tab and focus events.
 */
export class SearchEmoji implements Disposable {
  private readonly disposables: Disposable[] = [];
  private gitHooked = false;
  /** Whether a repository is open in git, so SCM would show a repo name. */
  private gitHasRepository = false;
  /** Whether this window has set the keys, so it can hand them back. */
  private labelled = false;
  /** Whether `${toucanRepoEmoji}` is registered in this window. */
  private registered = false;
  /** Whether the workspace's own window.title was logged, so it's logged once per change. */
  private reportedOverride = false;
  private readonly timer = createTimer();

  private readonly context: ExtensionContext;
  private readonly log: Log;
  private readonly repo: () => ActiveRepo | undefined;
  private readonly title: TitleSetup;

  constructor({ context, log, repo }: SearchEmojiArgs) {
    this.context = context;
    this.log = log;
    this.repo = repo;
    this.title = new TitleSetup(titlePorts({ context, log }));
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
      await this.hookGit();
      await this.assert();
    } else {
      await this.handBack();
    }
  }

  dispose(): void {
    this.timer.cancel();
    for (const disposable of this.disposables) {
      disposable.dispose();
    }
  }

  /** Sets the variable's value; see `repoVariableValue`. */
  private async assert(): Promise<void> {
    const change = this.context.globalState.get<TitleChange>(CHANGE_KEY);
    if (!change) {
      return;
    }
    const repo = this.repo();
    const values = titleValues({
      change,
      repo: repo && {
        name: repo.name,
        emoji: emojiFor({ hex: repo.config.background, glyph: repo.config.glyph }),
      },
      // VS Code's `${activeEditorShort}` is the active editor's title, empty without one.
      hasEditor: window.tabGroups.activeTabGroup.activeTab !== undefined,
    });
    if (values === undefined) {
      // A repo without a color shows SCM's own value.
      await this.handBack();
      return;
    }
    await this.registerEmojiVariable();
    await vscodeCommands.executeCommand("setContext", REPO_NAME_CONTEXT, values.lead);
    await vscodeCommands.executeCommand("setContext", EMOJI_CONTEXT, values.beforeRoot);
    this.labelled = true;
  }

  /**
   * Replaces Toucan's label with what SCM would show (the key can't be read
   * back): the folder name when git has a repository open, else nothing.
   * SCM overwrites it on its next change anyway.
   */
  private async handBack(): Promise<void> {
    if (!this.labelled) {
      return;
    }
    this.labelled = false;
    const name = this.gitHasRepository ? workspace.workspaceFolders?.[0]?.name : undefined;
    await vscodeCommands.executeCommand("setContext", REPO_NAME_CONTEXT, name ?? "");
    await vscodeCommands.executeCommand("setContext", EMOJI_CONTEXT, "");
  }

  /**
   * Registers `${toucanRepoEmoji}` with VS Code's window title, backed by
   * Toucan's own context key. Per window; registering again is harmless.
   */
  private async registerEmojiVariable(): Promise<void> {
    if (this.registered) {
      return;
    }
    await vscodeCommands.executeCommand(
      "registerWindowTitleVariable",
      EMOJI_VARIABLE_NAME,
      EMOJI_CONTEXT,
    );
    this.registered = true;
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

  /** SCM rewrites the key when repositories open, close or change branch. */
  private async hookGit(): Promise<void> {
    if (this.gitHooked) {
      return;
    }
    this.gitHooked = true;
    const [, error] = await tryCatch(() => this.watchGit());
    if (error !== null) {
      this.log.warn(`Couldn't watch git repositories for the search emoji: ${errorText(error)}`);
    }
  }

  /** Reasserts after every change to a git repository, and when one opens or closes. */
  private async watchGit(): Promise<void> {
    const git = extensions.getExtension<{ getAPI(version: 1): GitApi }>("vscode.git");
    if (!git) {
      return;
    }
    const api = (await git.activate()).getAPI(1);
    const watch = (repository: { state: { onDidChange: Event<void> } }) => {
      this.disposables.push(repository.state.onDidChange(() => this.reassertSoon()));
    };
    api.repositories.forEach(watch);
    this.gitHasRepository = api.repositories.length > 0;
    this.disposables.push(
      api.onDidOpenRepository((repository) => {
        watch(repository);
        this.gitHasRepository = true;
        this.reassertSoon();
      }),
      api.onDidCloseRepository(() => {
        this.gitHasRepository = api.repositories.length > 0;
        this.reassertSoon();
      }),
    );
  }
}

function enabled(): boolean {
  return workspace.getConfiguration().get(configs.experimentalSearchEmoji.key, false);
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
          detail: `Toucan's experimental search emoji needs \${activeRepositoryName} at the start of window.title, so it changes that setting in your user settings. Turning the emoji off restores your previous title.${
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
