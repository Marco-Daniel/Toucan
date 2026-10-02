import type { Glyph } from "./model.ts";

/** A point in glyph units: x to the right, y down, the glyph 16 units high. */
export type Point = readonly [number, number];

/**
 * A glyph as drawn (glyph-set plan, 0004): straight-edged polygons whose
 * corners are softened as if painted with a round stroke of width `softening`,
 * with holes cut out of the result. `pnpm font` bakes this into the plain
 * filled paths in src/generated/glyphPaths.ts, which everything else draws.
 */
export interface GlyphDesign {
  /** viewBox width; the height is always 16. */
  width: number;
  fills: readonly (readonly Point[])[];
  holes: readonly (readonly Point[])[];
  /** Round stroke width that softens the fills' corners. */
  softening: number;
}

/** Corner softening of the set (0004). */
export const SOFTENING = 1.5;
/** Holes get a lighter softening, so they stay open (0004). */
export const HOLE_SOFTENING = SOFTENING * 0.45;
/** The sun's rays stay pointy with a sharper softening (0006). */
export const SUN_SOFTENING = 0.7;

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** "x,y x,y …" as written in the reference sheet. */
function points(text: string): Point[] {
  return text.split(" ").map((pair) => {
    const [x, y] = pair.split(",").map(Number);
    return [x!, y!] as const;
  });
}

/** A regular polygon around (cx, cy), first vertex straight up. Round shapes are 14-gons (0004). */
function ngon(cx: number, cy: number, r: number, n = 14): Point[] {
  return Array.from({ length: n }, (_, i) => {
    const angle = (2 * Math.PI * i) / n;
    return [round2(cx + r * Math.sin(angle)), round2(cy - r * Math.cos(angle))] as const;
  });
}

/** A five-pointed star alternating outer and inner radius. */
function star(cx: number, cy: number, outer: number, inner: number): Point[] {
  return Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 === 0 ? outer : inner;
    const angle = (Math.PI * i) / 5;
    return [round2(cx + r * Math.sin(angle)), round2(cy - r * Math.cos(angle))] as const;
  });
}

/** The point at radius `r` and `angle` (clockwise from straight up) around the glyph's center. */
function at(r: number, angle: number): Point {
  return [round2(8 + r * Math.sin(angle)), round2(8 - r * Math.cos(angle))];
}

/**
 * The sun (0006): a 12-gon disc and eight separate straight rays from radius
 * `from` to `to`, each `half` of a ray step wide on either side at its base.
 */
function pinSun(disc: number, from: number, to: number, half: number, rays = 8): Point[][] {
  const step = (2 * Math.PI) / rays;
  const pins = Array.from({ length: rays }, (_, i) => {
    const angle = step * i;
    return [at(from, angle - half * step), at(from, angle + half * step), at(to, angle)];
  });
  return [ngon(8, 8, disc, 12), ...pins];
}

const shape = (width: number, fills: string[], holes: (string | Point[])[] = []) => ({
  width,
  fills: fills.map(points),
  holes: holes.map((hole) => (typeof hole === "string" ? points(hole) : hole)),
  softening: SOFTENING,
});

/** The agreed geometry, ported from the plan's reference sheet (assets/glyph-sheet.py). */
export const GLYPH_DESIGNS: Record<Glyph, GlyphDesign> = {
  square: shape(16, ["1.2,1.2 14.8,1.2 14.8,14.8 1.2,14.8"]),
  bar: shape(6, ["1.2,0.4 4.8,0.4 4.8,15.6 1.2,15.6"]),
  pill: shape(44, ["7,1.2 37,1.2 42.8,4 42.8,12 37,14.8 7,14.8 1.2,12 1.2,4"]),
  circle: { ...shape(16, []), fills: [ngon(8, 8, 6.8)] },
  // After the app icon (0005): head and beak, a notch between them and a cut-out eye.
  toucan: shape(
    18,
    [
      "4.6,1.2 7.4,1.3 7.8,5.2 10.6,7.6 11,10.4 8.8,13.2 6.4,15.3 4.4,15.3 4.4,13 1.6,11 1.8,6 3,2.8",
      "7.9,1.4 11.6,0.9 14.8,2 16.8,4.2 17.1,7.4 14.6,5.2 8.3,5.3",
    ],
    ["7.35,0.9 7.75,0.9 8.05,5.7 7.65,5.7", ngon(5.2, 3.6, 0.9, 8)],
  ),
  sun: { width: 16, fills: pinSun(2.8, 5.0, 7.9, 0.2), holes: [], softening: SUN_SOFTENING },
  leaf: shape(16, ["1.5,14.5 3,10 6,5 10.5,2 14.5,1.5 14,6 11,11 6,13.5"]),
  moon: { ...shape(16, []), fills: [ngon(8, 8, 6.8)], holes: [ngon(11.4, 5.4, 5.8)] },
  alien: shape(
    16,
    ["8,1 12.5,3 14.6,7 12,12 8,15 4,12 1.4,7 3.5,3"],
    ["3.8,6.6 7.1,8.2 6.6,10.2 4.5,9.4", "12.2,6.6 8.9,8.2 9.4,10.2 11.5,9.4"],
  ),
  ghost: shape(
    16,
    ["8,1 12.5,3 14,7 14,15 11.5,13 9.5,15 8,13 6.5,15 4.5,13 2,15 2,7 3.5,3"],
    ["4.8,6.2 7,6.2 7,9.4 4.8,9.4", "9,6.2 11.2,6.2 11.2,9.4 9,9.4"],
  ),
  robot: shape(
    16,
    ["2,4.4 7,4.4 7,1.2 9,1.2 9,4.4 14,4.4 14,14.6 2,14.6"],
    [
      "4.3,7 6.7,7 6.7,9.6 4.3,9.6",
      "9.3,7 11.7,7 11.7,9.6 9.3,9.6",
      "5,11.2 11,11.2 11,12.6 5,12.6",
    ],
  ),
  cat: shape(
    16,
    ["2,15 1.5,6 2.6,1.2 6,4 10,4 13.4,1.2 14.5,6 14,15"],
    ["4.3,7.8 6.6,7.8 6.6,10.2 4.3,10.2", "9.4,7.8 11.7,7.8 11.7,10.2 9.4,10.2"],
  ),
  bolt: shape(16, ["10,0.8 3,9 7.5,9 6,15.2 13,6 8.5,6"]),
  heart: shape(16, ["8,14.4 1.5,8 1.5,4.6 4,2 6.5,2 8,3.8 9.5,2 12,2 14.5,4.6 14.5,8"]),
  star: { ...shape(16, []), fills: [star(8, 8.6, 7.4, 3.3)] },
  rocket: shape(
    16,
    [
      "8,0.8 10.5,3.5 11,9 13.5,12 13.5,14.6 10.5,13 9.5,15 6.5,15 5.5,13 2.5,14.6 2.5,12 5,9 5.5,3.5",
    ],
    [ngon(8, 6.6, 1.3, 8)],
  ),
};
