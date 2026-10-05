// import libraries
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// import utils
import { FONT_CODEPOINTS } from "../src/features/glyphs/glyphFont.util.ts";
import { glyphIconId } from "../src/features/glyphs/glyphs.util.ts";

// import consts
import { BRAND_COLORS } from "@toucan/brand/colors.consts.ts";
import { GLYPHS } from "@toucan/brand/glyphs.consts.ts";
import {
  SIDEBAR_AVAILABLE_CONTEXT,
  SIDEBAR_SHOWN_CONTEXT,
  SIDEBAR_VIEW_ID,
} from "../src/core/ids.consts.ts";
import { COMMAND_CENTER_KEYS, SIDEBAR_VISIBILITIES } from "../src/shared/model/model.consts.ts";

const manifest = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const { properties } = manifest.contributes.configuration;
const [, entrySchema] = properties["toucan.repos"].additionalProperties.anyOf;

// The package.json schema and the parser must accept the same values.
describe("package.json configuration schema", () => {
  it("lists the same glyphs", () => {
    expect(entrySchema.properties.glyph.enum).toEqual([...GLYPHS]);
  });

  it("lists the same sidebar visibilities", () => {
    expect(entrySchema.properties.sidebarBlock.enum).toEqual([...SIDEBAR_VISIBILITIES]);
    expect(properties["toucan.sidebarBlock.visibility"].enum).toEqual([...SIDEBAR_VISIBILITIES]);
  });

  it("lists the same color keys", () => {
    const colorKeys = Object.keys(entrySchema.properties).filter(
      (key) => key !== "glyph" && key !== "sidebarBlock",
    );
    expect(colorKeys.toSorted()).toEqual([...COMMAND_CENTER_KEYS].toSorted());
  });
});

describe("package.json icon contributions", () => {
  it("registers every glyph's icon at its codepoint in Toucan's font", () => {
    const icons = manifest.contributes.icons as Record<
      string,
      { default: { fontPath: string; fontCharacter: string } }
    >;
    expect(new Set(Object.values(icons).map((icon) => icon.default.fontPath))).toEqual(
      new Set(["./media/toucan-icons.woff"]),
    );
    expect(
      Object.fromEntries(
        Object.entries(icons).map(([id, icon]) => [id, icon.default.fontCharacter]),
      ),
    ).toEqual(
      Object.fromEntries(
        GLYPHS.map((glyph) => [
          glyphIconId(glyph),
          `\\${FONT_CODEPOINTS[glyph].toString(16).toUpperCase()}`,
        ]),
      ),
    );
  });
});

describe("package.json sidebar block", () => {
  it("contributes the view to the Explorer with the when clause the code feeds", () => {
    expect(manifest.contributes.views).toEqual({
      explorer: [
        {
          type: "webview",
          id: SIDEBAR_VIEW_ID,
          name: "Toucan",
          visibility: "visible",
          when: `${SIDEBAR_AVAILABLE_CONTEXT} && ${SIDEBAR_SHOWN_CONTEXT}`,
        },
      ],
    });
  });

  it("no longer declares a view container, so the block has no Activity Bar icon or own bar", () => {
    expect(manifest.contributes).not.toHaveProperty("viewsContainers");
  });

  it("keeps the visibility setting and the per-repo field, both deprecated", () => {
    expect(properties["toucan.sidebarBlock.visibility"].deprecationMessage).toContain("ignored");
    expect(entrySchema.properties.sidebarBlock.deprecationMessage).toContain("ignored");
  });
});

// vsce packages the extension folder's LICENSE; the repo's own sits at the root.
describe("the packaged LICENSE", () => {
  it("is the repo's LICENSE, word for word", () => {
    const packaged = readFileSync(new URL("../LICENSE", import.meta.url), "utf8");
    expect(packaged.startsWith("MIT License")).toBe(true);
    expect(packaged).toBe(readFileSync(new URL("../../../LICENSE", import.meta.url), "utf8"));
  });
});

describe("the Marketplace banner", () => {
  it("is the brand's jungle green", () => {
    expect(manifest.galleryBanner).toEqual({ color: BRAND_COLORS.jungleGreen, theme: "dark" });
  });
});
