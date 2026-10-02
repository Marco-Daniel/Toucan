// Bakes a glyph design (src/core/glyphDesign.ts) into one plain filled SVG
// path: every fill grown by half its softening with round joins, as if
// painted with a round stroke, the fills united, and the holes (grown by half
// the lighter hole softening) cut out. Outlines and holes come out with
// opposite winding, so they read the same under the nonzero rule that SVG and
// TrueType fonts both use. Font tools drop strokes and masks; this doesn't
// need either (glyph-set plan, 0004).
import ClipperLib, { type Path, type Paths } from "clipper-lib";
import { HOLE_SOFTENING, type GlyphDesign, type Point } from "../src/core/glyphDesign.ts";

/** Clipper works in integers: 1/1000 of a glyph unit. */
const SCALE = 1000;
/** How far a rounded corner may deviate from a true arc, in glyph units. */
const ARC_TOLERANCE = 0.02;

const toPath = (points: readonly Point[]): Path =>
  points.map(([x, y]) => ({ X: Math.round(x * SCALE), Y: Math.round(y * SCALE) }));

function grow(polygons: readonly (readonly Point[])[], by: number): Paths {
  // Same orientation for every input, so overlapping fills unite under nonzero.
  const paths = polygons.map((points) => {
    const path = toPath(points);
    return ClipperLib.Clipper.Orientation(path) ? path : path.toReversed();
  });
  const offset = new ClipperLib.ClipperOffset(2, ARC_TOLERANCE * SCALE);
  offset.AddPaths(paths, ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon);
  const grown: Paths = [];
  offset.Execute(grown, by * SCALE);
  return grown;
}

function format(value: number): string {
  return String(Math.round((value / SCALE) * 100) / 100);
}

/** The design as an SVG path `d`. */
export function bakeGlyph(design: GlyphDesign): string {
  const clipper = new ClipperLib.Clipper();
  clipper.AddPaths(grow(design.fills, design.softening / 2), ClipperLib.PolyType.ptSubject, true);
  clipper.AddPaths(grow(design.holes, HOLE_SOFTENING / 2), ClipperLib.PolyType.ptClip, true);
  const solution: Paths = [];
  clipper.Execute(
    ClipperLib.ClipType.ctDifference,
    solution,
    ClipperLib.PolyFillType.pftNonZero,
    ClipperLib.PolyFillType.pftNonZero,
  );
  // Drop near-duplicate points from the arc approximation.
  return ClipperLib.Clipper.CleanPolygons(solution, 0.005 * SCALE)
    .filter((path) => path.length >= 3)
    .map((path) => `M${path.map(({ X, Y }) => `${format(X)} ${format(Y)}`).join("L")}Z`)
    .join("");
}
