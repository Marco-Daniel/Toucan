// import utils
import { presetSlug } from "./presets.util.ts";

/** `plumageBlack` as `plumage-black`. */
function kebabCase(name: string): string {
  return name.replaceAll(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

/** The colors as `:root` custom properties named `--brand-<name>`, for the Tailwind theme to read. */
export function brandCssVariables(colors: Readonly<Record<string, string>>): string {
  const declarations = Object.entries(colors).map(
    ([name, value]) => `--brand-${kebabCase(name)}:${value};`,
  );
  return `:root{${declarations.join("")}}`;
}

/** A class per preset that sets `--preset` to its color, as CSS: `.preset-beak-red{--preset:#f92824}`. */
export function presetCssClasses(presets: readonly { name: string; hex: string }[]): string {
  return presets.map(({ name, hex }) => `.preset-${presetSlug(name)}{--preset:${hex};}`).join("");
}
