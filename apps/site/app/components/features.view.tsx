// import libraries
import { Link } from "react-router";

// import utils
import { presetHex } from "../lib/presets.util.ts";

// import consts
import { screenshotUrl } from "../lib/brand.assets.ts";

interface Feature {
  title: string;
  text: string;
  screenshot: string;
  /** A thin strip: zoomed onto its Command Center instead of shown whole (website/0011). */
  isStrip: boolean;
  tag: string;
  docs: string;
}

const FEATURES: readonly Feature[] = [
  {
    title: "Command Center",
    text: "The search bar at the top takes the repo's color, with a readable text color worked out for you.",
    screenshot: "command-center.png",
    isStrip: true,
    tag: presetHex("Tropical Pink"),
    docs: "/docs/colors",
  },
  {
    title: "Status bar glyph",
    text: "A small glyph in the repo's color, from 17 hand-drawn shapes, sits next to the repo name.",
    screenshot: "status-bar.png",
    isStrip: false,
    tag: presetHex("Canopy Teal"),
    docs: "/docs/glyphs",
  },
  {
    title: "Sidebar block",
    text: "Optionally fill the secondary sidebar with the color, full or muted. Toucan only closes a bar it opened.",
    screenshot: "sidebar-block.png",
    isStrip: false,
    tag: presetHex("Bill Amber"),
    docs: "/docs/sidebar",
  },
  {
    title: "16 presets",
    text: "A toucan-themed palette with a live preview, and a warning when a color is hard to see on the status bar.",
    screenshot: "preset-color.png",
    isStrip: false,
    tag: presetHex("Jungle Green"),
    docs: "/docs/presets",
  },
  {
    title: "Glyph picker",
    text: "Shapes, Toucan's world, characters and fun & dev glyphs, previewed as you move through them.",
    screenshot: "set-glyph.png",
    isStrip: false,
    tag: presetHex("Orchid Purple"),
    docs: "/docs/glyphs",
  },
  {
    title: "Search emoji",
    text: "Experimental: an emoji in the window title, so the repo shows in the Command Center even when it's not focused.",
    screenshot: "search-emoji.png",
    isStrip: true,
    tag: presetHex("Beak Orange"),
    docs: "/docs/search-emoji",
  },
];

export function Features() {
  return (
    <div className="grid gap-[22px] md:grid-cols-2 lg:grid-cols-3 [&>*]:min-w-0">
      {FEATURES.map(({ title, text, screenshot, isStrip, tag, docs }) => (
        <Link
          key={title}
          to={docs}
          className="flex flex-col overflow-hidden rounded-2xl border-2 border-ink bg-white transition-shadow hover:shadow-[6px_6px_0_var(--color-amber)]"
        >
          {isStrip ? (
            <div className="flex aspect-[16/10] items-center overflow-hidden border-b-2 border-ink bg-code">
              <img
                src={screenshotUrl(screenshot)}
                alt=""
                className="-ml-[82%] w-[270%] max-w-none"
                loading="lazy"
              />
            </div>
          ) : (
            <img
              src={screenshotUrl(screenshot)}
              alt=""
              className="block aspect-[16/10] w-full border-b-2 border-ink object-cover object-left-top"
              loading="lazy"
            />
          )}
          <div className="px-5 pt-[18px] pb-[22px]">
            <h3 className="mb-1.5 text-xl font-bold tracking-tight">
              <span
                className="mr-2 inline-block size-3 rounded-[3px] align-[-1px]"
                style={{ background: tag }}
              />
              {title}
            </h3>
            <p className="text-[15px] text-muted">{text}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
