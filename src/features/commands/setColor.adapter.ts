import { InputBoxValidationSeverity, window } from "vscode";
import { validateColorInput } from "../../shared/color/color.util.ts";
import { LOW_CONTRAST_WARNING, lowContrast } from "../../shared/color/contrast.util.ts";
import { withBackground } from "./entries.util.ts";
import type { Hex } from "../../shared/model/model.types.ts";
import type { CommandHost } from "./commands.adapter.ts";
import { statusBarAgainst, writeRepos } from "./commandUi.adapter.ts";
import { Preview } from "./preview.adapter.ts";

export async function setColor(host: CommandHost, name: string): Promise<void> {
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
    } else if (input.kind === "color" && lowContrast({ color: input.hex, background: statusBar })) {
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
