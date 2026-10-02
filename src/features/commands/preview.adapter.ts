import { NEUTRAL_GRAY } from "../../shared/color/color.util.ts";
import type { RepoConfig } from "../../shared/config/config.util.ts";
import { DEFAULT_GLYPH } from "../../shared/model/model.consts.ts";
import type { CommandArgs, CommandHost } from "./commands.adapter.ts";

/**
 * Shows a changed color or glyph on this window's status bar only, without
 * writing settings, so typing and scrolling stay cheap.
 */
export class Preview {
  private readonly base: RepoConfig;

  private readonly host: CommandHost;
  private readonly name: string;

  constructor({ host, name }: CommandArgs) {
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
