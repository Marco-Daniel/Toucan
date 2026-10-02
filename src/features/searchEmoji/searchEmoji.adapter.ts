import { commands as vscodeCommands, extensions, window, workspace } from "vscode";
import type { Disposable, Event, ExtensionContext } from "vscode";
import { notify } from "../../core/notify.adapter.ts";
import type { Log } from "../../core/log.adapter.ts";
import { emojiFor } from "./emoji.util.ts";
import { titleChangeFailed } from "../../shared/messages/notifications.messages.ts";
import { TitleSetup } from "./titleSetup.util.ts";
import type { TitlePorts } from "./titleSetup.util.ts";
import { repoVariableValue, shouldLabel } from "./windowTitle.util.ts";
import type { TitleChange } from "./windowTitle.util.ts";
import { configs } from "../../generated/meta.ts";
import type { ActiveRepo } from "../../core/repo.adapter.ts";
import { errorText, tryCatch } from "../../shared/async/tryCatch.util.ts";
import { overriddenInWorkspace, writeUserSetting } from "../settings/settings.adapter.ts";
import { createTimer } from "../../shared/async/timer.util.ts";

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

interface SearchEmojiArgs {
  context: ExtensionContext;
  log: Log;
  repo: () => ActiveRepo | undefined;
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
    const value = repoVariableValue({
      change,
      repo: repo && {
        name: repo.name,
        emoji: emojiFor({ hex: repo.config.background, glyph: repo.config.glyph }),
      },
    });
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
    this.timer.start({
      ms: REASSERT_DELAY_MS,
      run: () => {
        // A .catch, not tryCatch: a timer has no caller to await the assert.
        this.assert().catch((error: unknown) => {
          this.log.warn(`Couldn't set the search emoji: ${String(error)}`);
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
