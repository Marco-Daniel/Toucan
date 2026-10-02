import type { Glyph } from "../../shared/model/model.types.ts";

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
/** Holes get a lighter softening, so they stay open (0004): this share of SOFTENING. */
const HOLE_SOFTENING_SHARE = 0.45;
export const HOLE_SOFTENING = SOFTENING * HOLE_SOFTENING_SHARE;
/** The sun's rays stay pointy with a sharper softening (0006). */
export const SUN_SOFTENING = 0.7;

/** The glyph's center on both axes: half its 16-unit height. */
const CENTER = 8;
/** A full turn in radians. */
// oxlint-disable-next-line no-magic-numbers -- 2π is the definition, not a tunable
const TURN = 2 * Math.PI;
/** Points are kept to hundredths of a unit. */
const HUNDREDTHS = 100;
/** The sun's disc is a 12-gon (0006). */
const SUN_DISC_SIDES = 12;
/** A star's five points, so ten vertices alternating outer and inner. */
const STAR_POINTS = 5;
const STAR_VERTICES = 10;

function round2(value: number): number {
  return Math.round(value * HUNDREDTHS) / HUNDREDTHS;
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
    const angle = (TURN * i) / n;
    return [round2(cx + r * Math.sin(angle)), round2(cy - r * Math.cos(angle))] as const;
  });
}

/** A five-pointed star alternating outer and inner radius. */
function star(cx: number, cy: number, outer: number, inner: number): Point[] {
  return Array.from({ length: STAR_VERTICES }, (_, i) => {
    // oxlint-disable-next-line no-magic-numbers -- parity: even vertices are the outer points
    const r = i % 2 === 0 ? outer : inner;
    const angle = (Math.PI * i) / STAR_POINTS;
    return [round2(cx + r * Math.sin(angle)), round2(cy - r * Math.cos(angle))] as const;
  });
}

/** The point at radius `r` and `angle` (clockwise from straight up) around the glyph's center. */
function at(r: number, angle: number): Point {
  return [round2(CENTER + r * Math.sin(angle)), round2(CENTER - r * Math.cos(angle))];
}

/**
 * The sun (0006): a 12-gon disc and eight separate straight rays from radius
 * `from` to `to`, each `half` of a ray step wide on either side at its base.
 */
function pinSun(disc: number, from: number, to: number, half: number, rays = 8): Point[][] {
  const step = TURN / rays;
  const pins = Array.from({ length: rays }, (_, i) => {
    const angle = step * i;
    return [at(from, angle - half * step), at(from, angle + half * step), at(to, angle)];
  });
  return [ngon(CENTER, CENTER, disc, SUN_DISC_SIDES), ...pins];
}

/**
 * A leaf blade from `base` to `tip`, `n` segments a side. Its half-width
 * follows sin(πt)^`taper`, so the tip is pointier than the base with a taper
 * below 1.
 */
function blade(base: Point, tip: Point, halfWidth: number, taper: number, n = 12): Point[] {
  const [bx, by] = base;
  const length = Math.hypot(tip[0] - bx, tip[1] - by);
  const [ux, uy] = [(tip[0] - bx) / length, (tip[1] - by) / length];
  const side = (sign: number): Point[] =>
    Array.from({ length: n - 1 }, (_, i) => {
      const t = (i + 1) / n;
      const w = halfWidth * Math.sin(Math.PI * t) ** taper * sign;
      return [
        round2(bx + ux * length * t - uy * w),
        round2(by + uy * length * t + ux * w),
      ] as const;
    });
  return [base, ...side(1), tip, ...side(-1).toReversed()];
}

/** A straight strip from `a` to `b`, `half` wide on either side. */
function strip(a: Point, b: Point, half: number): Point[] {
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const [nx, ny] = [(-(b[1] - a[1]) / length) * half, ((b[0] - a[0]) / length) * half];
  return [
    [round2(a[0] + nx), round2(a[1] + ny)],
    [round2(b[0] + nx), round2(b[1] + ny)],
    [round2(b[0] - nx), round2(b[1] - ny)],
    [round2(a[0] - nx), round2(a[1] - ny)],
  ];
}

const shape = (width: number, fills: string[], holes: (string | Point[])[] = []) => ({
  width,
  fills: fills.map(points),
  holes: holes.map((hole) => (typeof hole === "string" ? points(hole) : hole)),
  softening: SOFTENING,
});

/** The agreed geometry, ported from the plan's reference sheet (assets/glyph-sheet.py). */
/* oxlint-disable no-magic-numbers -- glyph coordinates and sizes: the table is the design */
export const GLYPH_DESIGNS: Record<Glyph, GlyphDesign> = {
  square: shape(16, ["1.2,1.2 14.8,1.2 14.8,14.8 1.2,14.8"]),
  // Ends 0.75 in, so the softened outline fills the box exactly.
  bar: shape(6, ["1.2,0.75 4.8,0.75 4.8,15.25 1.2,15.25"]),
  pill: shape(44, ["7,1.2 37,1.2 42.8,4 42.8,12 37,14.8 7,14.8 1.2,12 1.2,4"]),
  circle: { ...shape(16, []), fills: [ngon(8, 8, 6.8)] },
  // After the app icon (0005): head and beak, a notch between them and a cut-out eye.
  toucan: shape(
    18,
    [
      "4.6,1.2 7.4,1.3 7.8,5.2 10.6,7.6 11,10.4 8.8,13.2 6.4,15.25 4.4,15.25 4.4,13 1.6,11 1.8,6 3,2.8",
      "7.9,1.4 11.6,0.9 14.8,2 16.8,4.2 17.1,7.4 14.6,5.2 8.3,5.3",
    ],
    ["7.35,0.9 7.75,0.9 8.05,5.7 7.65,5.7", ngon(5.2, 3.6, 0.9, 8)],
  ),
  // Rays end at radius 7.65 (8 minus half the sun's softening), so their tips stay in the box.
  sun: { width: 16, fills: pinSun(2.8, 5.0, 7.65, 0.2), holes: [], softening: SUN_SOFTENING },
  // A pointed blade on a short stem (0007).
  leaf: {
    ...shape(16, []),
    fills: [blade([3.6, 12.4], [14.3, 1.7], 3.6, 0.8), strip([1.2, 14.8], [4.6, 11.4], 0.25)],
  },
  // The sheet's drop (0007), its tip and bottom 0.1 in, so the softened outline stays in the box.
  drop: shape(16, ["8,0.9 12.4,7.5 12.9,11 11,14.4 8,15.2 5,14.4 3.1,11 3.6,7.5"]),
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
/* oxlint-enable no-magic-numbers */
