// The parts of clipper-lib (Clipper 6, no bundled types) that bake-glyphs.mts uses.
declare module "clipper-lib" {
  export interface IntPoint {
    X: number;
    Y: number;
  }
  export type Path = IntPoint[];
  export type Paths = Path[];
  const ClipperLib: {
    ClipperOffset: new (
      miterLimit: number,
      arcTolerance: number,
    ) => {
      AddPaths(paths: Paths, joinType: number, endType: number): void;
      Execute(solution: Paths, delta: number): void;
    };
    Clipper: {
      new (): {
        AddPaths(paths: Paths, polyType: number, closed: boolean): boolean;
        Execute(clipType: number, solution: Paths, subjFill: number, clipFill: number): boolean;
      };
      Orientation(path: Path): boolean;
      CleanPolygons(paths: Paths, distance: number): Paths;
    };
    JoinType: { jtRound: number };
    EndType: { etClosedPolygon: number };
    PolyType: { ptSubject: number; ptClip: number };
    ClipType: { ctUnion: number; ctDifference: number };
    PolyFillType: { pftNonZero: number };
  };
  export default ClipperLib;
}
