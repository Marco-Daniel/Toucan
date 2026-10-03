// import libraries
import { Link } from "react-router";

// import utils
import { presetHex } from "../lib/presets.util.ts";
import { sizedSvg } from "../lib/svg.util.ts";

// import views
import { BuildMarkup } from "./buildMarkup.view.tsx";
import { Glyph } from "./glyph.view.tsx";

// import consts
import { HERO_SVG } from "../lib/brand.assets.ts";

// import types
import type { Glyph as GlyphName } from "@toucan/brand/glyphs.types.ts";

/** Three repos as their status bar items, under the hero's sunset. */
const STATUS_ROWS: readonly { repo: string; glyph: GlyphName; color: string }[] = [
  { repo: "webshop", glyph: "heart", color: presetHex("Tropical Pink") },
  { repo: "payments-api", glyph: "rocket", color: presetHex("Canopy Teal") },
  { repo: "docs-site", glyph: "leaf", color: presetHex("Bill Amber") },
];

const buttonClass =
  "inline-flex min-h-11 items-center gap-2 rounded-[10px] border-2 border-cream px-[18px] py-2.5 text-[15px] font-bold";

export function Hero() {
  return (
    <header className="overflow-hidden bg-jungle text-cream">
      <div className="mx-auto grid max-w-[1120px] items-center gap-10 px-4 pt-16 pb-14 sm:px-6 md:grid-cols-[1.05fr_0.95fr] md:pt-[72px] md:pb-16 [&>*]:min-w-0">
        <div>
          <span className="inline-block rounded-md bg-ink/25 px-2.5 py-1 text-[13px] font-bold tracking-[0.08em] uppercase">
            VS Code extension
          </span>
          <h1 className="my-[18px] text-[44px] leading-[1.02] font-extrabold tracking-[-0.035em] md:text-[64px]">
            Every repo gets its <em className="text-amber not-italic">own color</em>.
          </h1>
          <p className="mb-7 max-w-[30em] text-[19px] opacity-95">
            Toucan tints the Command Center, marks the status bar with a glyph and can fill the
            sidebar, so you always know which window you're typing in.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/#install" className={`${buttonClass} bg-cream text-ink`}>
              Install for VS Code
            </Link>
            <Link to="/#features" className={buttonClass}>
              See how it works
            </Link>
          </div>
          <p className="mt-[18px] text-sm opacity-85">Free and open source · MIT licensed</p>
        </div>
        <div className="flex flex-col items-center">
          <BuildMarkup
            className="-mb-9 w-full max-w-[440px]"
            html={sizedSvg({ svg: HERO_SVG, className: "block h-auto w-full" })}
          />
          <div className="relative w-full max-w-[400px] rounded-xl bg-code p-2.5 shadow-[0_20px_40px_rgb(0_0_0/0.3)]">
            {STATUS_ROWS.map(({ repo, glyph, color }) => (
              <div
                key={repo}
                className="flex h-[30px] items-center gap-2 border-b border-[#2a2a2a] px-3 font-mono text-[13px] last:border-0"
                style={{ color }}
              >
                <Glyph glyph={glyph} className="h-4 w-auto" />
                {repo}
              </div>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
