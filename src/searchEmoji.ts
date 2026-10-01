import {
  ConfigurationTarget,
  commands as vscodeCommands,
  extensions,
  window,
  workspace,
  type Disposable,
  type Event,
  type ExtensionContext,
} from "vscode";
import type { Log } from "./log.ts";
import { emojiFor } from "./core/emoji.ts";
import { titleChangeFailed } from "./core/messages.ts";
import { TitleSetup, type TitlePorts } from "./core/titleSetup.ts";
import { repoVariableValue, shouldLabel, type TitleChange } from "./core/windowTitle.ts";
import { configs } from "./generated/meta.ts";
import type { ActiveRepo } from "./repo.ts";

const WINDOW_TITLE = "window.title";
/** The per-window context key behind `${activeRepositoryName}` (internal to VS Code). */
const REPO_NAME_CONTEXT = "scmActiveRepositoryName";
/** globalState: what Toucan changed in window.title (0015). */
const CHANGE_KEY = "searchEmoji.titleChange";
/** SCM rewrites the key after its own events; reassert just after them. */
const REASSERT_DELAY_MS = 50;

/** The slice of the built-in git extension's API this uses. */
interface GitApi {
  repositories: { state: { onDidChange: Event<void> } }[];
  onDidOpenRepository: Event<{ state: { onDidChange: Event<void> } }>;
  onDidCloseRepository: Event<unknown>;
}

/**
 * The experimental emoji in the Command Center label (0007, 0015). It needs
 * `${activeRepositoryName}` in the global window.title, which Toucan only
 * adds after asking, and restores when the feature is turned off. Then it
 * overwrites the internal `scmActiveRepositoryName` context key with the
 * repo's emoji and name, reasserting it after SCM, editor and focus events.
 */
export class SearchEmoji implements Disposable {
  private readonly disposables: Disposable[] = [];
  private gitHooked = false;
  /** Whether a repository is open in git, so SCM would show a repo name. */
  private gitHasRepository = false;
  /** Whether this window has set the key, so it can hand it back. */
  private labelled = false;
  /** Whether the workspace's own window.title was logged, so it's logged once per change. */
  private reportedOverride = false;
  private timer: ReturnType<typeof setTimeout> | undefined;

  private readonly context: ExtensionContext;
  private readonly log: Log;
  private readonly repo: () => ActiveRepo | undefined;
  private readonly title: TitleSetup;

  constructor(context: ExtensionContext, log: Log, repo: () => ActiveRepo | undefined) {
    this.context = context;
    this.log = log;
    this.repo = repo;
    this.title = new TitleSetup(titlePorts(context, log));
    this.disposables.push(window.onDidChangeActiveTextEditor(() => this.reassertSoon()));
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
    if (shouldLabel(enabled(), change)) {
      const overridden = workspaceTitle();
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
    if (this.timer !== undefined) {
      clearTimeout(this.timer);
    }
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
    const value = repoVariableValue(
      change,
      repo && { name: repo.name, emoji: emojiFor(repo.config.background, repo.config.glyph) },
    );
    if (value === undefined) {
      // A repo without a color shows SCM's own value.
      await this.handBack();
      return;
    }
    await vscodeCommands.executeCommand("setContext", REPO_NAME_CONTEXT, value);
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
  }

  private reassertSoon(): void {
    if (!enabled()) {
      return;
    }
    if (this.timer !== undefined) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.assert().catch((error: unknown) => {
        this.log.warn(`Couldn't set the search emoji: ${String(error)}`);
      });
    }, REASSERT_DELAY_MS);
  }

  /** SCM rewrites the key when repositories open, close or change branch. */
  private async hookGit(): Promise<void> {
    if (this.gitHooked) {
      return;
    }
    this.gitHooked = true;
    try {
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
    } catch (error) {
      this.log.warn(`Couldn't watch git repositories for the search emoji: ${String(error)}`);
    }
  }
}

function enabled(): boolean {
  return workspace.getConfiguration().get(configs.experimentalSearchEmoji.key, false);
}

/** Whether this workspace or folder sets its own window.title, hiding the user-level one. */
function workspaceTitle(): boolean {
  const inspected = workspace.getConfiguration().inspect<string>(WINDOW_TITLE);
  return inspected?.workspaceValue !== undefined || inspected?.workspaceFolderValue !== undefined;
}

function titlePorts(context: ExtensionContext, log: Log): TitlePorts {
  return {
    enabled,
    focused: () => window.state.focused,
    now: () => Date.now(),
    title: () => {
      const inspected = workspace.getConfiguration().inspect<string>(WINDOW_TITLE);
      return {
        global: inspected?.globalValue,
        default: inspected?.defaultValue,
        overridden: workspaceTitle(),
      };
    },
    readChange: () => context.globalState.get<TitleChange>(CHANGE_KEY),
    writeChange: async (change) => {
      await context.globalState.update(CHANGE_KEY, change);
    },
    writeTitle: async (value) => {
      await workspace.getConfiguration().update(WINDOW_TITLE, value, ConfigurationTarget.Global);
    },
    disable: async () => {
      await workspace
        .getConfiguration()
        .update(configs.experimentalSearchEmoji.key, false, ConfigurationTarget.Global);
    },
    ask: async (overridden) => {
      const answer = await window.showInformationMessage(
        "Show the repo's emoji in the search bar?",
        {
          modal: true,
          detail:
            "Toucan's experimental search emoji needs ${activeRepositoryName} at the start of window.title, so it changes that setting in your user settings. Turning the emoji off restores your previous title." +
            (overridden
              ? " This workspace sets its own window.title, so the emoji won't show in this window."
              : ""),
        },
        "Change Window Title",
      );
      return answer === "Change Window Title";
    },
    info: (message) => log.info(message),
    failed: (error) => {
      log.warn(titleChangeFailed(error));
      void window.showWarningMessage(titleChangeFailed(error));
    },
  };
}
