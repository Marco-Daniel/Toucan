import { MarkdownString, StatusBarAlignment, window } from "vscode";
import type { Disposable } from "vscode";
import { escapeIcons, glyphIcon, glyphSvg, svgDataUri } from "../glyphs/glyphs.util.ts";
import { accessibilityLabel } from "./labels.util.ts";
import { commands } from "../../generated/meta.ts";
import { STATUS_ITEM_ID } from "../../core/ids.consts.ts";
import type { ActiveRepo } from "../../core/repo.adapter.ts";

const TOOLTIP_SWATCH_HEIGHT = 32;

/**
 * The always-on indicator (0005): the repo's glyph and name in its color, in
 * every window, without writing settings. Hidden for unconfigured repos (0008).
 */
export class StatusBarIndicator implements Disposable {
  // Max priority puts it right after the remote indicator, which stays leftmost.
  private readonly item = window.createStatusBarItem(
    STATUS_ITEM_ID,
    StatusBarAlignment.Left,
    Number.MAX_VALUE,
  );

  constructor() {
    this.item.name = "Toucan";
    this.item.command = commands.setColor;
  }

  private actual: ActiveRepo | undefined;
  private previewed: ActiveRepo | undefined;

  /** Shows the saved state, unless a preview is on top of it. */
  update(repo: ActiveRepo | undefined): void {
    this.actual = repo;
    this.render();
  }

  /**
   * Shows an unsaved color or glyph on top of the saved state, so a refresh
   * in the meantime doesn't interrupt it. `undefined` ends the preview.
   */
  preview(repo: ActiveRepo | undefined): void {
    this.previewed = repo;
    this.render();
  }

  private render(): void {
    const repo = this.previewed ?? this.actual;
    if (!repo) {
      this.item.hide();
      return;
    }
    const { name, config } = repo;
    this.item.text = `${glyphIcon(config.glyph)} ${escapeIcons(name)}`;
    this.item.color = config.background;
    this.item.accessibilityInformation = { label: accessibilityLabel(name, config) };
    this.item.tooltip = tooltip(repo);
    this.item.show();
  }

  dispose(): void {
    this.item.dispose();
  }
}

function tooltip({ name, config }: ActiveRepo): MarkdownString {
  const swatch = svgDataUri(glyphSvg(config.glyph, config.background, TOOLTIP_SWATCH_HEIGHT));
  const markdown = new MarkdownString();
  // Before appendText: it escapes $(…) in the repo name only when this is on.
  markdown.supportThemeIcons = true;
  markdown.appendMarkdown(`![${config.glyph}](${swatch})\n\n`);
  markdown.appendMarkdown(`**`);
  markdown.appendText(name);
  markdown.appendMarkdown(`** · \`${config.background}\`\n\n`);
  markdown.appendMarkdown(
    [
      `[$(symbol-color) Set Color](command:${commands.setColor})`,
      `[$(paintcan) Preset](command:${commands.pickPreset})`,
      `[$(shield) Glyph](command:${commands.setGlyph})`,
      `[$(close) Clear](command:${commands.clearColor})`,
    ].join(" · "),
  );
  // Only Toucan's own commands may run from the tooltip links.
  markdown.isTrusted = { enabledCommands: Object.values(commands) };
  return markdown;
}
