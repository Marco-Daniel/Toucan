// import libraries
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";

// import views
import { GlyphShowcase } from "../../app/components/glyphShowcase.view.tsx";
import { Hero } from "../../app/components/hero.view.tsx";
import { Install } from "../../app/components/install.view.tsx";
import { Palette } from "../../app/components/palette.view.tsx";

// import types
import type { ReactNode } from "react";

const render = (node: ReactNode) => renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>);
const text = (html: string) =>
  html
    .replaceAll(/<[^>]+>/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim();

describe("the landing page sections", () => {
  it("shows the 16 presets, each with its name and hex", () => {
    const html = render(<Palette />);
    expect(
      [...html.matchAll(/<b[^>]*>([^<]+)<\/b><code[^>]*>([^<]+)<\/code>/g)].map(
        ([, name, hex]) => `${name} ${hex}`,
      ),
    ).toEqual([
      "Beak Red #f92824",
      "Berry Red #a3161a",
      "Beak Orange #e0620b",
      "Bill Amber #faa404",
      "Beak Yellow #fde246",
      "Bill Lime #8a9c05",
      "Jungle Green #56915e",
      "Canopy Teal #14939c",
      "Slate Blue #2c4a51",
      "Orchid Purple #6241bd",
      "Lilac #b59ae0",
      "Plum #70486c",
      "Tropical Pink #e8579b",
      "Blossom Pink #f5a3c7",
      "Silver #a7a8b3",
      "Plumage Black #101316",
    ]);
  });

  it("shows the 17 glyphs in their four groups, each drawn from its brand SVG", () => {
    const html = render(<GlyphShowcase />);
    expect(text(html)).toBe(
      "Shapes square bar pill circle Toucan&#x27;s world toucan sun leaf drop moon Characters alien ghost robot cat Fun &amp; dev bolt heart star rocket",
    );
    // Square, bar, pill, circle, then the toucan (18 wide); every other glyph is 16 by 16.
    expect([...html.matchAll(/<svg [^>]*viewBox="([^"]+)"/g)].map(([, box]) => box)).toEqual([
      "0 0 16 16",
      "0 0 6 16",
      "0 0 44 16",
      "0 0 16 16",
      "0 0 18 16",
      ...Array.from({ length: 12 }, () => "0 0 16 16"),
    ]);
    expect([...html.matchAll(/<path d="M/g)]).toHaveLength(17);
  });

  it("puts three repos in the hero's status bar, each in its preset color", () => {
    const html = render(<Hero />);
    expect(
      [...html.matchAll(/style="color:(#[\da-f]{6})"><svg[^>]*>.*?<\/svg>([\w-]+)</g)].map(
        ([, color, repo]) => `${repo} ${color}`,
      ),
    ).toEqual(["webshop #e8579b", "payments-api #14939c", "docs-site #faa404"]);
  });

  it("installs the latest release's VSIX and marks the stores as coming", () => {
    const html = render(<Install version="0.0.4" releaseUrl="https://example.test/v0.0.4" />);
    // It wraps only at the space before the file name, never inside either part.
    expect(html).toContain(
      '<span class="whitespace-nowrap">code --install-extension</span> <span class="whitespace-nowrap">toucan-0.0.4.vsix</span>',
    );
    expect(html).toContain('<a href="https://example.test/v0.0.4"');
    expect([...html.matchAll(/Coming soon\./g)]).toHaveLength(2);
  });
});
