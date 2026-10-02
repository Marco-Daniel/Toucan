import { ColorThemeKind, Uri, window, workspace } from "vscode";
import { notify } from "../../core/notify.adapter.ts";
import { activeThemeName, statusBarBackground } from "../../shared/color/contrast.util.ts";
import { glyphSvg, svgDataUri } from "../glyphs/glyphs.util.ts";
import { saveFailed } from "../../shared/messages/notifications.messages.ts";
import type { Glyph, Hex } from "../../shared/model/model.types.ts";
import { COLOR_CUSTOMIZATIONS } from "../focus/focus.adapter.ts";
import { configs } from "../../generated/meta.ts";
import type { SettingsUpdate } from "../settings/settingsWrite.util.ts";
import type { CommandHost } from "./commands.adapter.ts";
import { tryCatch } from "../../shared/async/tryCatch.util.ts";

/** A quick pick swatch is drawn 16 px high. */
const SWATCH_PX = 16;

interface SwatchArgs {
  glyph: Glyph;
  hex: Hex;
}

export function swatch({ glyph, hex }: SwatchArgs): Uri {
  return Uri.parse(svgDataUri(glyphSvg(glyph, hex, SWATCH_PX)));
}

/** The status bar background to check picked colors against (0018). */
export function statusBarAgainst(): Hex | undefined {
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

interface WriteReposArgs {
  host: CommandHost;
  update: SettingsUpdate;
}

export async function writeRepos({ host, update }: WriteReposArgs): Promise<void> {
  // Application-scoped, so VS Code keeps it in the default profile's file.
  const [, error] = await tryCatch(() =>
    host.writer.write({ key: configs.repos.key, update, target: "defaultProfile" }),
  );
  if (error !== null) {
    notify({ level: "error", message: saveFailed(error) });
  }
}
