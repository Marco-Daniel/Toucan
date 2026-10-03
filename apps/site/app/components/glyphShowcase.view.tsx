// import utils
import { presetHex } from "../lib/presets.util.ts";

// import views
import { Glyph } from "./glyph.view.tsx";

// import consts
import { GLYPH_GROUPS } from "@toucan/brand/glyphs.consts.ts";

/** The colors the chips take in turn, as in the mockup. */
const CHIP_COLORS = [
  "Beak Orange",
  "Canopy Teal",
  "Tropical Pink",
  "Jungle Green",
  "Orchid Purple",
].map(presetHex);

/** Every glyph, in the groups Set Glyph shows. */
export function GlyphShowcase() {
  return (
    <div className="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-4 [&>*]:min-w-0">
      {GLYPH_GROUPS.map(({ label, glyphs }) => (
        <div key={label}>
          <h3 className="mb-2.5 text-[13px] font-bold tracking-[0.08em] text-faded uppercase">
            {label}
          </h3>
          <ul className="flex flex-wrap gap-2">
            {glyphs.map((glyph, index) => (
              <li
                key={glyph}
                className="flex w-[72px] flex-col items-center gap-1.5 rounded-xl bg-chip pt-3 pb-2"
                style={{ color: CHIP_COLORS[index % CHIP_COLORS.length] }}
              >
                <Glyph glyph={glyph} className="h-7 w-auto max-w-14" />
                <span className="text-xs text-[#d8d2c2]">{glyph}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
