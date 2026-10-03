// import consts
import { BRAND_PRESETS } from "@toucan/brand/presets.consts.ts";

/** A preset's hex by its name. Throws on an unknown name, so a renamed preset fails the build. */
export function presetHex(name: string): string {
  const preset = BRAND_PRESETS.find((candidate) => candidate.name === name);
  if (preset === undefined) {
    throw new Error(`No preset named ${name}`);
  }
  return preset.hex;
}
