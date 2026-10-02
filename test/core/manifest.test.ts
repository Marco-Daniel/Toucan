import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { FONT_CODEPOINTS, glyphIconId } from "../../src/core/glyphs.ts";
import { SIDEBAR_AVAILABLE_CONTEXT, SIDEBAR_CONTAINER_ID, SIDEBAR_VIEW_ID } from "../../src/ids.ts";
import { COMMAND_CENTER_KEYS, GLYPHS, SIDEBAR_VISIBILITIES } from "../../src/core/model.ts";

const manifest = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"));
const properties = manifest.contributes.configuration.properties;
const entrySchema = properties["toucan.repos"].additionalProperties.anyOf[1];

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
  it("declares the container, view and when clause the code uses", () => {
    expect(manifest.contributes.viewsContainers.secondarySidebar).toEqual([
      { id: SIDEBAR_CONTAINER_ID, title: "Toucan", icon: "$(symbol-color)" },
    ]);
    expect(manifest.contributes.views[SIDEBAR_CONTAINER_ID]).toEqual([
      { type: "webview", id: SIDEBAR_VIEW_ID, name: "Toucan", when: SIDEBAR_AVAILABLE_CONTEXT },
    ]);
  });
});
