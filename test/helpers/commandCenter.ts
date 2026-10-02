import { asHex } from "../../src/shared/color/hex.util.ts";
import type { CommandCenterColors } from "../../src/shared/model/model.types.ts";

/** Command Center colors with `background`; the other keys are fixed. */
export function commandCenterColors(background: string): CommandCenterColors {
  return {
    background: asHex(background),
    foreground: asHex("#ffffff"),
    activeBackground: asHex("#222222"),
    activeForeground: asHex("#ffffff"),
    border: asHex("#333333"),
    activeBorder: asHex("#333333"),
    inactiveForeground: asHex("#ffffff99"),
    inactiveBorder: asHex("#33333380"),
  };
}

/** The colors as Toucan's `commandCenter.*` keys in workbench.colorCustomizations. */
export function asCustomizations(colors: CommandCenterColors) {
  return Object.fromEntries(
    Object.entries(colors).map(([key, value]) => [`commandCenter.${key}`, value]),
  );
}
