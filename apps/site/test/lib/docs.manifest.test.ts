// The docs pages describe the extension, so they're checked against its
// manifest and the brand: every setting with its default, every command by its
// palette label, and every count of presets, glyphs and groups.
// import libraries
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// import consts
import { GLYPH_GROUPS, GLYPHS } from "@toucan/brand/glyphs.consts.ts";
import { BRAND_PRESETS } from "@toucan/brand/presets.consts.ts";

const doc = (slug: string) =>
  readFileSync(new URL(`../../content/docs/${slug}.md`, import.meta.url), "utf8");
const manifest = JSON.parse(
  readFileSync(new URL("../../../extension/package.json", import.meta.url), "utf8"),
);
const settings: Record<string, { default: unknown }> =
  manifest.contributes.configuration.properties;
const commands: { title: string; category: string }[] = manifest.contributes.commands;
const ALL_DOCS = [
  "getting-started",
  "colors",
  "presets",
  "glyphs",
  "sidebar",
  "search-emoji",
  "settings",
  "commands",
]
  .map(doc)
  .join("\n");
const NUMBER_WORDS = [
  "zero",
  "one",
  "two",
  "three",
  "four",
  "five",
  "six",
  "seven",
  "eight",
  "nine",
];

describe("the settings page", () => {
  const page = doc("settings");

  it("has a section for every setting in the manifest, in its order, and no other", () => {
    expect([...page.matchAll(/^## (\S+)$/gm)].map(([, key]) => key)).toEqual(Object.keys(settings));
  });

  it("gives each setting the manifest's default", () => {
    const defaults = Object.fromEntries(
      [...page.matchAll(/^## (\S+)\n\nDefault: `([^`]*)`$/gm)].map(([, key, value]) => [
        key,
        value,
      ]),
    );
    expect(defaults).toEqual(
      Object.fromEntries(
        Object.entries(settings).map(([key, { default: value }]) => [key, JSON.stringify(value)]),
      ),
    );
  });
});

describe("the commands page", () => {
  it("lists every command by its palette label, in the manifest's order", () => {
    expect(
      [...doc("commands").matchAll(/^\| \*\*(.+?)\*\* +\|/gm)].map(([, label]) => label),
    ).toEqual(commands.map(({ category, title }) => `${category}: ${title}`));
  });
});

describe("the counts in the docs", () => {
  it("say as many presets as the brand has", () => {
    const counts = [...ALL_DOCS.matchAll(/(\d+) toucan-themed/g)].map(([, count]) => Number(count));
    expect(counts.length).toBeGreaterThanOrEqual(2);
    expect(new Set(counts)).toEqual(new Set([BRAND_PRESETS.length]));
  });

  it("say as many glyphs and groups as the brand has", () => {
    const glyphs = [...ALL_DOCS.matchAll(/(?:one of |)(\d+)(?= glyphs| in )/g)].map(([, count]) =>
      Number(count),
    );
    const groups = [...ALL_DOCS.matchAll(/in (\w+) groups/g)].map(([, word]) =>
      NUMBER_WORDS.indexOf(word ?? ""),
    );
    expect(glyphs.length).toBeGreaterThanOrEqual(3);
    expect(new Set(glyphs)).toEqual(new Set([GLYPHS.length]));
    expect(groups.length).toBeGreaterThanOrEqual(2);
    expect(new Set(groups)).toEqual(new Set([GLYPH_GROUPS.length]));
  });
});
