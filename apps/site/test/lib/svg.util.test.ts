// import libraries
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// import utils
import { glyphShape, heroScene, scopeSvgIds, sizedSvg } from "../../app/lib/svg.util.ts";

const brandAsset = (path: string) =>
  readFileSync(new URL(`../../../../packages/brand/assets/${path}`, import.meta.url), "utf8");

describe("scopeSvgIds", () => {
  it("prefixes every id and every url() and href reference to one", () => {
    expect(
      scopeSvgIds({
        svg: '<svg><mask id="beak"/><clipPath id="sky"/><g mask="url(#beak)" clip-path="url(#sky)"/><use href="#beak"/></svg>',
        prefix: "nav",
      }),
    ).toBe(
      '<svg><mask id="nav-beak"/><clipPath id="nav-sky"/><g mask="url(#nav-beak)" clip-path="url(#nav-sky)"/><use href="#nav-beak"/></svg>',
    );
  });
});

describe("sizedSvg", () => {
  it("drops the root's fixed size, adds the class and hides it from screen readers", () => {
    expect(
      sizedSvg({
        svg: '<svg viewBox="0 0 4 4" width="512" height="512"><rect width="4" height="4"/></svg>',
        className: "logo",
      }),
    ).toBe(
      '<svg class="logo" aria-hidden="true" viewBox="0 0 4 4"><rect width="4" height="4"/></svg>',
    );
  });

  it("throws on something that isn't an SVG", () => {
    expect(() => sizedSvg({ svg: "<div></div>", className: "x" })).toThrow("Not an SVG document");
  });
});

describe("heroScene", () => {
  const icon = brandAsset("icon.svg");
  const hero = heroScene(icon);

  it("is the icon without its tile", () => {
    expect(icon).toContain('<rect width="128" height="128" rx="28" fill="#56915e"/>');
    expect(hero).not.toContain('rx="28"');
    expect(hero.length).toBe(
      icon.length -
        '<rect width="128" height="128" rx="28" fill="#56915e"/>'.length +
        '<rect x="0" y="78" width="128" height="1.6" fill="#56915e"/>'.length,
    );
  });

  it("draws a second, thinner horizon line right after the first", () => {
    expect(hero).toContain(
      '<rect x="0" y="73" width="128" height="2.5" fill="#56915e"/><rect x="0" y="78" width="128" height="1.6" fill="#56915e"/>',
    );
  });

  it("fails the build when the icon lost the tile or the horizon it changes", () => {
    expect(() => heroScene(icon.replace('rx="28"', 'rx="30"'))).toThrow(
      "no longer has the tile and horizon",
    );
    expect(() => heroScene(icon.replace('y="73"', 'y="74"'))).toThrow(
      "no longer has the tile and horizon",
    );
  });
});

describe("glyphShape", () => {
  it("reads a brand glyph's view box and path", () => {
    const { viewBox, d } = glyphShape(brandAsset("glyphs/pill.svg"));
    expect(viewBox).toBe("0 0 44 16");
    expect(d.startsWith("M37.33 0.53L43.13 3.33")).toBe(true);
  });

  it("throws on an SVG with more than one path or no view box", () => {
    expect(() =>
      glyphShape('<svg viewBox="0 0 1 1"><path d="M0 0"/><path d="M1 1"/></svg>'),
    ).toThrow("expected a view box and exactly one path");
    expect(() => glyphShape('<svg><path d="M0 0"/></svg>')).toThrow(
      "expected a view box and exactly one path",
    );
  });
});
