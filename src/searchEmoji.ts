import {
  ConfigurationTarget,
  commands as vscodeCommands,
  extensions,
  window,
  workspace,
  type Disposable,
  type Event,
  type ExtensionContext,
  type LogOutputChannel,
} from "vscode";
import { emojiFor } from "./core/emoji.ts";
import {
  repoVariableValue,
  searchEmojiStep,
  shouldLabel,
  titleToRestore,
  titleWithRepoVariable,
  unappliedChange,
  type TitleChange,
} from "./core/windowTitle.ts";
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
  private asking = false;
  private timer: ReturnType<typeof setTimeout> | undefined;

  private readonly context: ExtensionContext;
  private readonly log: LogOutputChannel;
  private readonly repo: () => ActiveRepo | undefined;

  constructor(
    context: ExtensionContext,
    log: LogOutputChannel,
    repo: () => ActiveRepo | undefined,
  ) {
    this.context = context;
    this.log = log;
    this.repo = repo;
    this.disposables.push(
      window.onDidChangeActiveTextEditor(() => this.reassertSoon()),
      window.onDidChangeWindowState((state) => {
        this.reassertSoon();
        // A pending consent or restore waits for a focused window.
        if (state.focused) {
          void this.refresh();
        }
      }),
    );
  }

  /** After activation, a focus change or a `toucan.*` change. */
  async refresh(): Promise<void> {
    const configuration = workspace.getConfiguration();
    const enabled = configuration.get(configs.experimentalSearchEmoji.key, false);
    let change = this.context.globalState.get<TitleChange>(CHANGE_KEY);
    const title = configuration.inspect<string>(WINDOW_TITLE)?.globalValue;
    // Only the focused window heals: it's the one that may have crashed mid-write.
    if (window.state.focused && change && unappliedChange(change, title, Date.now())) {
      await this.context.globalState.update(CHANGE_KEY, undefined);
      change = undefined;
    }
    const step = searchEmojiStep({ enabled, focused: window.state.focused, change });
    if (step === "ask") {
      try {
        await this.askAndApply();
      } catch (error) {
        // The record was cleared again in askAndApply; just tell the user.
        this.log.warn(`Couldn't change ${WINDOW_TITLE}: ${String(error)}`);
        void window.showWarningMessage(`Toucan couldn't change ${WINDOW_TITLE}: ${String(error)}`);
      }
    } else if (step === "restore" && change) {
      await this.restore(change);
    }
    if (shouldLabel(enabled, this.context.globalState.get<TitleChange>(CHANGE_KEY))) {
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

  private async askAndApply(): Promise<void> {
    if (this.asking) {
      return;
    }
    this.asking = true;
    try {
      const configuration = workspace.getConfiguration();
      const inspected = configuration.inspect<string>(WINDOW_TITLE);
      const previous = inspected?.globalValue;
      const written = titleWithRepoVariable(previous ?? inspected?.defaultValue ?? "");
      if (written !== undefined) {
        const answer = await window.showInformationMessage(
          "Show the repo's emoji in the search bar?",
          {
            modal: true,
            detail:
              "Toucan's experimental search emoji needs ${activeRepositoryName} at the start of window.title, so it changes that setting in your user settings. Turning the emoji off restores your previous title.",
          },
          "Change Window Title",
        );
        if (answer !== "Change Window Title") {
          await configuration.update(
            configs.experimentalSearchEmoji.key,
            false,
            ConfigurationTarget.Global,
          );
          return;
        }
      }
      // Record the previous title before changing it: if the window dies in
      // between, the record still lets Toucan restore it later.
      await this.context.globalState.update(CHANGE_KEY, {
        previous,
        written,
        ...(written !== undefined ? { pendingSince: Date.now() } : {}),
      } satisfies TitleChange);
      if (written !== undefined) {
        try {
          await configuration.update(WINDOW_TITLE, written, ConfigurationTarget.Global);
        } catch (error) {
          await this.context.globalState.update(CHANGE_KEY, undefined);
          throw error;
        }
        // Settled: no longer pending.
        await this.context.globalState.update(CHANGE_KEY, {
          previous,
          written,
        } satisfies TitleChange);
        this.log.info(`Changed ${WINDOW_TITLE} for the search emoji.`);
      }
    } finally {
      this.asking = false;
    }
  }

  private async restore(change: TitleChange): Promise<void> {
    const configuration = workspace.getConfiguration();
    const current = configuration.inspect<string>(WINDOW_TITLE)?.globalValue;
    const result = titleToRestore(change, current);
    if (result.restore) {
      await configuration.update(WINDOW_TITLE, result.value, ConfigurationTarget.Global);
      this.log.info(`Restored ${WINDOW_TITLE}.`);
    } else if (change.written !== undefined) {
      this.log.info(`Left ${WINDOW_TITLE} alone: it was changed after Toucan set it.`);
    }
    await this.context.globalState.update(CHANGE_KEY, undefined);
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
    if (!workspace.getConfiguration().get(configs.experimentalSearchEmoji.key, false)) {
      return;
    }
    if (this.timer !== undefined) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.assert();
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
