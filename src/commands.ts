import {
  ColorThemeKind,
  InputBoxValidationSeverity,
  Uri,
  commands as vscodeCommands,
  window,
  workspace,
  type Disposable,
  type QuickPickItem,
} from "vscode";
import { NEUTRAL_GRAY, validateColorInput } from "./core/color.ts";
import {
  LOW_CONTRAST_WARNING,
  activeThemeName,
  lowContrast,
  statusBarBackground,
} from "./core/contrast.ts";
import type { RepoConfig } from "./core/config.ts";
import { handEditedKeys, withBackground, withGlyph, withoutRepo } from "./core/entries.ts";
import { glyphSvg, svgDataUri } from "./core/glyphs.ts";
import { NO_COLOR, NO_COLOR_YET, clearConfirmation } from "./core/messages.ts";
import { DEFAULT_GLYPH, GLYPHS, type Glyph, type Hex } from "./core/model.ts";
import { PRESETS } from "./core/presets.ts";
import { COLOR_CUSTOMIZATIONS } from "./focus.ts";
import { commands, configs } from "./generated/meta.ts";
import type { ActiveRepo } from "./repo.ts";
import { userValue, type SettingsUpdate, type SettingsWriter } from "./settingsWriter.ts";
import type { SidebarBlock } from "./sidebar.ts";
import type { StatusBarIndicator } from "./statusBar.ts";
import { isRecord } from "./core/records.ts";

export interface CommandHost {
  /** Writes toucan.repos, keeping comments when it safely can (0017). */
  writer: SettingsWriter;
  /** This window's repo (first folder) name, configured or not. */
  repoName(): string | undefined;
  /** This window's repo if it has an entry. */
  activeRepo(): ActiveRepo | undefined;
  indicator: StatusBarIndicator;
  sidebar: Pick<SidebarBlock, "toggle">;
}

/**
 * All five commands. Set Color, Pick Preset Color, Set Glyph and Clear Color
 * write `toucan.repos`; Toggle Sidebar Block belongs to the sidebar block.
 */
export function registerCommands(host: CommandHost): Disposable[] {
  return [
    vscodeCommands.registerCommand(commands.toggleSidebarBlock, () => host.sidebar.toggle()),
    vscodeCommands.registerCommand(commands.setColor, withRepo(host, setColor)),
    vscodeCommands.registerCommand(commands.pickPreset, withRepo(host, pickPreset)),
    vscodeCommands.registerCommand(commands.setGlyph, withRepo(host, setGlyph)),
    vscodeCommands.registerCommand(commands.clearColor, withRepo(host, clearColor)),
  ];
}

async function setColor(host: CommandHost, name: string): Promise<void> {
  const preview = new Preview(host, name);
  const box = window.createInputBox();
  box.title = `Toucan: Color for ${name}`;
  box.prompt = "Any CSS color: #e91e63, rebeccapurple, oklch(0.6 0.15 30)…";
  box.value = host.activeRepo()?.config.background ?? "";
  let accepted = false;

  const statusBar = statusBarAgainst();
  const validate = (value: string): Hex | undefined => {
    const input = validateColorInput(value);
    if (input.kind === "invalid") {
      box.validationMessage = input.message;
    } else if (input.kind === "color" && lowContrast(input.hex, statusBar)) {
      // A warning, not an error: the color can still be saved (0018).
      box.validationMessage = {
        message: LOW_CONTRAST_WARNING,
        severity: InputBoxValidationSeverity.Warning,
      };
    } else {
      box.validationMessage = undefined;
    }
    return input.kind === "color" ? input.hex : undefined;
  };

  box.onDidChangeValue((value) => {
    const hex = validate(value);
    if (hex) {
      preview.show({ background: hex });
    } else {
      preview.restore();
    }
  });
  box.onDidAccept(async () => {
    const hex = validate(box.value);
    if (!hex) {
      return;
    }
    accepted = true;
    box.hide();
    await writeRepos(host, (repos) => ({ value: withBackground(repos, name, hex) }));
    // The saved value is in place now (or the save failed and the old one is).
    preview.restore();
  });
  box.onDidHide(() => {
    if (!accepted) {
      preview.restore();
    }
    box.dispose();
  });
  box.show();
}

async function pickPreset(host: CommandHost, name: string): Promise<void> {
  const glyph = host.activeRepo()?.config.glyph ?? DEFAULT_GLYPH;
  const current = host.activeRepo()?.config.background;
  const statusBar = statusBarAgainst();
  const items = PRESETS.map((preset) => {
    const item: QuickPickItem & { hex: Hex } = {
      label: preset.name,
      description: preset.hex === current ? `${preset.hex} · current` : preset.hex,
      iconPath: swatch(glyph, preset.hex),
      hex: preset.hex,
    };
    // Marked, not hidden: the user can still pick it (0018).
    if (lowContrast(preset.hex, statusBar)) {
      item.detail = `$(warning) ${LOW_CONTRAST_WARNING}`;
    }
    return item;
  });
  const picked = await pickWithPreview(
    host,
    name,
    items,
    `Toucan: Preset for ${name}`,
    (item) => ({
      background: item.hex,
    }),
    items.find((item) => item.hex === current),
  );
  if (picked) {
    await writeRepos(host, (repos) => ({ value: withBackground(repos, name, picked.item.hex) }));
    picked.done();
  }
}

async function setGlyph(host: CommandHost, name: string): Promise<void> {
  const repo = host.activeRepo();
  if (!repo) {
    const action = await window.showInformationMessage(NO_COLOR_YET, "Set Color");
    if (action) {
      await vscodeCommands.executeCommand(commands.setColor);
    }
    return;
  }
  const items = GLYPHS.map((glyph) => {
    const item: QuickPickItem & { glyph: Glyph } = {
      label: glyph,
      iconPath: swatch(glyph, repo.config.background),
      glyph,
    };
    if (glyph === repo.config.glyph) {
      item.description = "current";
    }
    return item;
  });
  const picked = await pickWithPreview(
    host,
    name,
    items,
    `Toucan: Glyph for ${name}`,
    (item) => ({
      glyph: item.glyph,
    }),
    items.find((item) => item.glyph === repo.config.glyph),
  );
  if (picked) {
    await writeRepos(host, (repos) => {
      const value = withGlyph(repos, name, picked.item.glyph);
      // No entry anymore (cleared meanwhile): leave toucan.repos alone.
      return value && { value };
    });
    picked.done();
  }
}

async function clearColor(host: CommandHost, name: string): Promise<void> {
  const raw = readRepos();
  if (!isRecord(raw) || !Object.hasOwn(raw, name)) {
    void window.showInformationMessage(NO_COLOR);
    return;
  }
  // Only a bare color is cheap to set again; anything more was typed by hand.
  const handEdited = handEditedKeys(raw, name);
  if (handEdited.length > 0) {
    const { message, detail } = clearConfirmation(handEdited);
    const answer = await window.showWarningMessage(message, { modal: true, detail }, "Clear");
    if (answer !== "Clear") {
      return;
    }
  }
  // From the settings at write time, not `raw`: the dialog may have been open
  // while another window changed a different repo.
  await writeRepos(host, (repos) => ({ value: withoutRepo(repos, name) }));
}

/**
 * A quick pick that previews the active item on the status bar. On cancel the
 * preview ends; after a pick the caller saves and then calls `done`.
 */
function pickWithPreview<T extends QuickPickItem>(
  host: CommandHost,
  name: string,
  items: T[],
  title: string,
  change: (item: T) => Partial<RepoConfig>,
  active: T | undefined,
): Promise<{ item: T; done: () => void } | undefined> {
  const preview = new Preview(host, name);
  const pick = window.createQuickPick<T>();
  pick.title = title;
  pick.items = items;
  if (active) {
    pick.activeItems = [active];
  }
  return new Promise((resolve) => {
    let picked: T | undefined;
    pick.onDidChangeActive(([item]) => {
      if (item) {
        preview.show(change(item));
      }
    });
    pick.onDidAccept(() => {
      picked = pick.selectedItems[0] ?? pick.activeItems[0];
      pick.hide();
    });
    pick.onDidHide(() => {
      pick.dispose();
      if (picked) {
        resolve({ item: picked, done: () => preview.restore() });
      } else {
        preview.restore();
        resolve(undefined);
      }
    });
    pick.show();
  });
}

/**
 * Shows a changed color or glyph on this window's status bar only, without
 * writing settings, so typing and scrolling stay cheap.
 */
class Preview {
  private readonly base: RepoConfig;

  private readonly host: CommandHost;
  private readonly name: string;

  constructor(host: CommandHost, name: string) {
    this.host = host;
    this.name = name;
    this.base = host.activeRepo()?.config ?? {
      background: NEUTRAL_GRAY,
      overrides: {},
      glyph: DEFAULT_GLYPH,
    };
  }

  show(change: Partial<RepoConfig>): void {
    this.host.indicator.preview({ name: this.name, config: { ...this.base, ...change } });
  }

  /** Back to the saved state: after a cancel, or once a save has finished or failed. */
  restore(): void {
    this.host.indicator.preview(undefined);
  }
}

/** Runs a command for this window's repo, or explains that a folder is needed. */
function withRepo(
  host: CommandHost,
  command: (host: CommandHost, name: string) => Promise<void>,
): () => Promise<void> {
  return async () => {
    const name = host.repoName();
    if (name === undefined) {
      void window.showWarningMessage("Toucan colors a repository. Open a folder first.");
      return;
    }
    await command(host, name);
  };
}

function swatch(glyph: Glyph, hex: Hex): Uri {
  return Uri.parse(svgDataUri(glyphSvg(glyph, hex, 16)));
}

/** The status bar background to check picked colors against (0018). */
function statusBarAgainst(): Hex | undefined {
  const themeKind = window.activeColorTheme.kind;
  const kind =
    themeKind === ColorThemeKind.Light
      ? "light"
      : themeKind === ColorThemeKind.Dark
        ? "dark"
        : "highContrast";
  const configuration = workspace.getConfiguration();
  return statusBarBackground({
    kind,
    themeName: activeThemeName({
      kind,
      autoDetect: configuration.get("window.autoDetectColorScheme"),
      colorTheme: configuration.get("workbench.colorTheme"),
      preferredDark: configuration.get("workbench.preferredDarkColorTheme"),
      preferredLight: configuration.get("workbench.preferredLightColorTheme"),
    }),
    // The effective (merged) value on purpose: workspace overrides color the status bar too.
    customizations: configuration.get(COLOR_CUSTOMIZATIONS),
  });
}

/**
 * The user's toucan.repos as VS Code sees it. In a window that just opened,
 * the view can briefly miss another window's edit; the writes therefore run
 * as updaters on the value at write time.
 */
function readRepos(): unknown {
  return userValue(configs.repos.key);
}

async function writeRepos(host: CommandHost, update: SettingsUpdate): Promise<void> {
  try {
    // Application-scoped, so VS Code keeps it in the default profile's file.
    await host.writer.write(configs.repos.key, update, "defaultProfile");
  } catch (error) {
    void window.showErrorMessage(`Toucan couldn't save ${configs.repos.key}: ${String(error)}`);
  }
}
