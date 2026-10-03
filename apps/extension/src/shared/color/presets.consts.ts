// import utils
import { asHex } from "./hex.util.ts";

// import consts
import { BRAND_PRESETS } from "@toucan/brand/presets.consts.ts";

// import types
import type { Hex } from "../model/model.types.ts";

export interface Preset {
  name: string;
  hex: Hex;
}

/** The brand's palette (toucan-v1/0014) as colors Toucan can store; a picked preset is stored as its hex. */
export const PRESETS: readonly Preset[] = BRAND_PRESETS.map(({ name, hex }) => ({
  name,
  hex: asHex(hex),
}));
