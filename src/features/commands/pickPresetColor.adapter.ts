import type { QuickPickItem } from "vscode";
import { LOW_CONTRAST_WARNING, lowContrast } from "../../shared/color/contrast.util.ts";
import { withBackground } from "./entries.util.ts";
import type { Hex } from "../../shared/model/model.types.ts";
import { DEFAULT_GLYPH } from "../../shared/model/model.consts.ts";
import { PRESETS } from "../../shared/color/presets.consts.ts";
import type { CommandArgs } from "./commands.adapter.ts";
import { statusBarAgainst, swatch, writeRepos } from "./commandUi.adapter.ts";
import { pickWithPreview } from "./pickWithPreview.adapter.ts";

export async function pickPreset({ host, name }: CommandArgs): Promise<void> {
  const glyph = host.activeRepo()?.config.glyph ?? DEFAULT_GLYPH;
  const current = host.activeRepo()?.config.background;
  const statusBar = statusBarAgainst();
  const items = PRESETS.map((preset) => {
    const item: QuickPickItem & { hex: Hex } = {
      label: preset.name,
      description: preset.hex === current ? `${preset.hex} · current` : preset.hex,
      iconPath: swatch({ glyph, hex: preset.hex }),
      hex: preset.hex,
    };
    // Marked, not hidden: the user can still pick it (toucan-v1/0018).
    if (lowContrast({ color: preset.hex, background: statusBar })) {
      item.detail = `$(warning) ${LOW_CONTRAST_WARNING}`;
    }
    return item;
  });
  const picked = await pickWithPreview({
    host,
    name,
    items,
    title: `Toucan: Preset for ${name}`,
    change: (item) => ({
      background: item.hex,
    }),
    active: items.find((item) => item.hex === current),
  });
  if (picked) {
    await writeRepos({
      host,
      update: (repos) => ({
        value: withBackground({ raw: repos, repo: name, background: picked.item.hex }),
      }),
    });
    picked.done();
  }
}
