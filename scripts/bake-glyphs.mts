// Bakes a glyph design (src/features/glyphs/glyphDesign.consts.ts) into one
// plain filled SVG path: every fill grown by half its softening with round
// joins, as if painted with a round stroke, the fills united, and the holes
// (grown by half the lighter hole softening) cut out. Outlines and holes come
// out with opposite winding, so they read the same under the nonzero rule that
// SVG and TrueType fonts both use. Font tools drop strokes and masks; this
// doesn't need either (glyph-set plan, 0004).
import ClipperLib from "clipper-lib";
import type { Path, Paths } from "clipper-lib";
import { HOLE_SOFTENING } from "../src/features/glyphs/glyphDesign.consts.ts";
import type { GlyphDesign, Point } from "../src/features/glyphs/glyphDesign.consts.ts";

/** Clipper works in integers: 1/1000 of a glyph unit. */
const SCALE = 1000;
/** How far a rounded corner may deviate from a true arc, in glyph units. */
const ARC_TOLERANCE = 0.02;
/** Clipper's default miter limit; round joins never reach it. */
const MITER_LIMIT = 2;
/** A round stroke reaches this share of its width beyond the outline. */
const STROKE_REACH = 0.5;
/** Points closer than this, in glyph units, merge when the outline is cleaned. */
const CLEAN_DISTANCE = 0.005;
/** Fewer points than this aren't a polygon. */
const MIN_POLYGON_POINTS = 3;
/** Path coordinates are written to hundredths of a unit. */
const HUNDREDTHS = 100;

const toPath = (points: readonly Point[]): Path =>
  points.map(([x, y]) => ({ X: Math.round(x * SCALE), Y: Math.round(y * SCALE) }));

function grow(polygons: readonly (readonly Point[])[], by: number): Paths {
  // Same orientation for every input, so overlapping fills unite under nonzero.
  const paths = polygons.map((points) => {
    const path = toPath(points);
    return ClipperLib.Clipper.Orientation(path) ? path : path.toReversed();
  });
  const offset = new ClipperLib.ClipperOffset(MITER_LIMIT, ARC_TOLERANCE * SCALE);
  offset.AddPaths(paths, ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon);
  const grown: Paths = [];
  offset.Execute(grown, by * SCALE);
  return grown;
}

function format(value: number): string {
  return String(Math.round((value / SCALE) * HUNDREDTHS) / HUNDREDTHS);
}

/** The design as an SVG path `d`. */
export function bakeGlyph(design: GlyphDesign): string {
  const clipper = new ClipperLib.Clipper();
  clipper.AddPaths(
    grow(design.fills, design.softening * STROKE_REACH),
    ClipperLib.PolyType.ptSubject,
    true,
  );
  clipper.AddPaths(
    grow(design.holes, HOLE_SOFTENING * STROKE_REACH),
    ClipperLib.PolyType.ptClip,
    true,
  );
  const solution: Paths = [];
  clipper.Execute(
    ClipperLib.ClipType.ctDifference,
    solution,
    ClipperLib.PolyFillType.pftNonZero,
    ClipperLib.PolyFillType.pftNonZero,
  );
  // Drop near-duplicate points from the arc approximation.
  return ClipperLib.Clipper.CleanPolygons(solution, CLEAN_DISTANCE * SCALE)
    .filter((path) => path.length >= MIN_POLYGON_POINTS)
    .map((path) => `M${path.map(({ X, Y }) => `${format(X)} ${format(Y)}`).join("L")}Z`)
    .join("");
}
