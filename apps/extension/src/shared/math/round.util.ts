const HUNDREDTHS = 100;

/** `value` rounded to two decimals, the precision glyph coordinates are kept at. */
export function roundToHundredths(value: number): number {
  return Math.round(value * HUNDREDTHS) / HUNDREDTHS;
}
