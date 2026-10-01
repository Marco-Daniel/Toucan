import type { Hex } from "./model.ts";

export interface Preset {
  name: string;
  hex: Hex;
}

/** The toucan-themed palette (0014). A picked preset is stored as its hex. */
export const PRESETS: readonly Preset[] = (
  [
    ["Beak Red", "#f92824"],
    ["Berry Red", "#a3161a"],
    ["Beak Orange", "#e0620b"],
    ["Bill Amber", "#faa404"],
    ["Beak Yellow", "#fde246"],
    ["Bill Lime", "#8a9c05"],
    ["Jungle Green", "#56915e"],
    ["Canopy Teal", "#14939c"],
    ["Slate Blue", "#2c4a51"],
    ["Orchid Purple", "#6241bd"],
    ["Lilac", "#b59ae0"],
    ["Plum", "#70486c"],
    ["Tropical Pink", "#e8579b"],
    ["Blossom Pink", "#f5a3c7"],
    ["Silver", "#a7a8b3"],
    ["Plumage Black", "#101316"],
  ] as const
).map(([name, hex]) => ({ name, hex: hex as Hex }));
