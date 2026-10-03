// import utils
import { glyphShapeOf } from "../lib/brand.assets.ts";

// import types
import type { Glyph as GlyphName } from "@toucan/brand/glyphs.types.ts";

interface GlyphProps {
  glyph: GlyphName;
  className: string;
}

/** A status bar glyph in the current text color. */
export function Glyph({ glyph, className }: GlyphProps) {
  const { viewBox, d } = glyphShapeOf(glyph);
  return (
    <svg className={className} viewBox={viewBox} fill="currentColor" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
