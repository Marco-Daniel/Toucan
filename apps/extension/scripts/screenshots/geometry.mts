// Pure helpers for the README screenshot script: areas to capture and colors
// as the page reports them.

/** A box in CSS pixels. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface AroundArgs {
  boxes: readonly Rect[];
  margin: number;
  /** The window's size; the area never reaches past it. */
  bounds: { width: number; height: number };
}

/** The area around the boxes, with a margin, inside the window. */
export function around({ boxes, margin, bounds }: AroundArgs): Rect {
  const left = Math.max(0, Math.min(...boxes.map(({ x }) => x)) - margin);
  const top = Math.max(0, Math.min(...boxes.map(({ y }) => y)) - margin);
  const right = Math.min(
    bounds.width,
    Math.max(...boxes.map(({ x, width }) => x + width)) + margin,
  );
  const bottom = Math.min(
    bounds.height,
    Math.max(...boxes.map(({ y, height }) => y + height)) + margin,
  );
  return { x: left, y: top, width: right - left, height: bottom - top };
}

const HEX_COLOR = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;
const HEX = 16;

/** "#e8579b" as the page reports a background color: "rgb(232, 87, 155)". */
export function rgb(hex: string): string {
  const match = HEX_COLOR.exec(hex);
  if (!match) {
    throw new Error(`Not a #rrggbb color: ${hex}`);
  }
  const [, red = "", green = "", blue = ""] = match;
  return `rgb(${Number.parseInt(red, HEX)}, ${Number.parseInt(green, HEX)}, ${Number.parseInt(blue, HEX)})`;
}
