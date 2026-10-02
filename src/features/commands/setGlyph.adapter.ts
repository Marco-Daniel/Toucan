import { commands as vscodeCommands, window, type QuickPickItem } from "vscode";
import { withGlyph } from "./entries.util.ts";
import { glyphPickItems } from "../glyphs/glyphs.util.ts";
import { NO_COLOR_YET } from "../../shared/messages/notifications.messages.ts";
import type { Glyph } from "../../shared/model/model.types.ts";
import { DEFAULT_GLYPH } from "../../shared/model/model.consts.ts";
import { commands } from "../../generated/meta.ts";
import type { CommandHost } from "./commands.adapter.ts";
import { swatch, writeRepos } from "./commandUi.adapter.ts";
import { pickWithPreview } from "./pickWithPreview.adapter.ts";

export async function setGlyph(host: CommandHost, name: string): Promise<void> {
  const repo = host.activeRepo();
  if (!repo) {
    const action = await window.showInformationMessage(NO_COLOR_YET, "Set Color");
    if (action) {
      await vscodeCommands.executeCommand(commands.setColor);
    }
    return;
  }
  const items: (QuickPickItem & { glyph?: Glyph })[] = glyphPickItems(repo.config.glyph, (glyph) =>
    swatch(glyph, repo.config.background),
  );
  const picked = await pickWithPreview(
    host,
    name,
    items,
    `Toucan: Glyph for ${name}`,
    // Separators can't become active or be picked, so every item here has a glyph.
    (item) => (item.glyph ? { glyph: item.glyph } : {}),
    items.find((item) => item.glyph === repo.config.glyph),
  );
  if (picked) {
    await writeRepos(host, (repos) => {
      const value = withGlyph(repos, name, picked.item.glyph ?? DEFAULT_GLYPH);
      // No entry anymore (cleared meanwhile): leave toucan.repos alone.
      return value && { value };
    });
    picked.done();
  }
}
