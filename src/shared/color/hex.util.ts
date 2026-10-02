// import types
import type { Hex } from "../model/model.types.ts";

const HEX_FORM = /^#[\da-f]{6}(?:[\da-f]{2})?$/;

/** Whether `value` is a lowercase `#rrggbb` or `#rrggbbaa`, the form `toHex` produces. */
export function isHex(value: string): value is Hex {
  return HEX_FORM.test(value);
}

/** A known color in hex form as a Hex. Throws on anything else, so a typo fails at load. */
export function asHex(value: string): Hex {
  if (!isHex(value)) {
    throw new Error(`Not a lowercase #rrggbb or #rrggbbaa color: ${value}`);
  }
  return value;
}
