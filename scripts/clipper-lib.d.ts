// The parts of clipper-lib (Clipper 6, no bundled types) that bake-glyphs.mts
// uses. Each enum gets its own branded type, so passing a member of one where
// another is expected doesn't type-check.
declare module "clipper-lib" {
  export interface IntPoint {
    X: number;
    Y: number;
  }
  export type Path = IntPoint[];
  export type Paths = Path[];
  type JoinType = number & { readonly __enum: "JoinType" };
  type EndType = number & { readonly __enum: "EndType" };
  type PolyType = number & { readonly __enum: "PolyType" };
  type ClipType = number & { readonly __enum: "ClipType" };
  type PolyFillType = number & { readonly __enum: "PolyFillType" };
  const ClipperLib: {
    ClipperOffset: new (
      miterLimit: number,
      arcTolerance: number,
    ) => {
      AddPaths(paths: Paths, joinType: JoinType, endType: EndType): void;
      Execute(solution: Paths, delta: number): void;
    };
    Clipper: {
      new (): {
        AddPaths(paths: Paths, polyType: PolyType, closed: boolean): boolean;
        Execute(
          clipType: ClipType,
          solution: Paths,
          subjFill: PolyFillType,
          clipFill: PolyFillType,
        ): boolean;
      };
      Orientation(path: Path): boolean;
      CleanPolygons(paths: Paths, distance: number): Paths;
    };
    JoinType: { jtRound: JoinType };
    EndType: { etClosedPolygon: EndType };
    PolyType: { ptSubject: PolyType; ptClip: PolyType };
    ClipType: { ctDifference: ClipType };
    PolyFillType: { pftNonZero: PolyFillType };
  };
  export default ClipperLib;
}
