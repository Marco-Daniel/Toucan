// import libraries
import { describe, expect, it } from "vitest";

// import utils
import {
  LOW_CONTRAST_WARNING,
  activeThemeName,
  lowContrast,
  presetName,
  statusBarBackground,
} from "../../../src/shared/color/contrast.util.ts";
import { accessibilityLabel } from "../../../src/features/statusBar/labels.util.ts";
import { asHex } from "../../../src/shared/color/hex.util.ts";

describe("statusBarBackground", () => {
  it("uses the representative Modern theme color for the kind", () => {
    expect(statusBarBackground({ kind: "dark", themeName: "Some Theme", customizations: {} })).toBe(
      "#181818",
    );
    expect(
      statusBarBackground({ kind: "light", themeName: undefined, customizations: undefined }),
    ).toBe("#f8f8f8");
  });

  it("prefers the user's top-level override", () => {
    expect(
      statusBarBackground({
        kind: "dark",
        themeName: "Default Dark Modern",
        customizations: { "statusBar.background": "#007ACC" },
      }),
    ).toBe("#007acc");
  });

  it("lets the active theme's own block win over the top-level override", () => {
    expect(
      statusBarBackground({
        kind: "dark",
        themeName: "Default Dark Modern",
        customizations: {
          "statusBar.background": "#007acc",
          "[Default Dark Modern]": { "statusBar.background": "#222222" },
          "[Other Theme]": { "statusBar.background": "#ffffff" },
        },
      }),
    ).toBe("#222222");
  });

  it("ignores an override that isn't a color", () => {
    expect(
      statusBarBackground({
        kind: "dark",
        themeName: undefined,
        customizations: { "statusBar.background": "nope" },
      }),
    ).toBe("#181818");
  });

  it("gives nothing to compare in high contrast themes", () => {
    expect(
      statusBarBackground({
        kind: "highContrast",
        themeName: undefined,
        customizations: { "statusBar.background": "#000000" },
      }),
    ).toBeUndefined();
  });
});

describe("activeThemeName", () => {
  const themes = {
    colorTheme: "Default Dark Modern",
    preferredDark: "Monokai",
    preferredLight: "Solarized Light",
  };

  it("uses workbench.colorTheme without auto-detect", () => {
    expect(activeThemeName({ kind: "light", autoDetect: false, ...themes })).toBe(
      "Default Dark Modern",
    );
  });

  it("uses the preferred theme for the OS scheme with auto-detect", () => {
    expect(activeThemeName({ kind: "dark", autoDetect: true, ...themes })).toBe("Monokai");
    expect(activeThemeName({ kind: "light", autoDetect: true, ...themes })).toBe("Solarized Light");
  });

  it("ignores auto-detect in high contrast themes", () => {
    expect(activeThemeName({ kind: "highContrast", autoDetect: true, ...themes })).toBe(
      "Default Dark Modern",
    );
  });

  it("gives no name for a value that isn't a string", () => {
    expect(
      activeThemeName({ kind: "dark", autoDetect: true, ...themes, preferredDark: 42 }),
    ).toBeUndefined();
  });
});

describe("LOW_CONTRAST_WARNING", () => {
  // Both pickers show it as is (toucan-v1/0018): a guess at the status bar, so no ratio.
  it("says the color may be hard to see, without a measured ratio", () => {
    expect(LOW_CONTRAST_WARNING).toBe("May be hard to see on the status bar.");
  });
});

describe("lowContrast", () => {
  it("flags colors under 3:1 against the status bar", () => {
    expect(lowContrast({ color: asHex("#101316"), background: asHex("#181818") })).toBe(true); // Plumage Black, 1.05
    expect(lowContrast({ color: asHex("#8a9c05"), background: asHex("#f8f8f8") })).toBe(true); // Bill Lime, 2.89
  });

  it("puts the line at 3:1 (no hex color lands exactly on it against Dark Modern)", () => {
    expect(lowContrast({ color: asHex("#7747cb"), background: asHex("#181818") })).toBe(true); // 2.999999, the closest below
    expect(lowContrast({ color: asHex("#646464"), background: asHex("#181818") })).toBe(false); // 3.0006
  });

  it("accepts colors at or above 3:1", () => {
    expect(lowContrast({ color: asHex("#e8579b"), background: asHex("#f8f8f8") })).toBe(false); // Tropical Pink, 3.15
    expect(lowContrast({ color: asHex("#f92824"), background: asHex("#181818") })).toBe(false); // Beak Red
  });

  it("never warns without a background to compare", () => {
    expect(lowContrast({ color: asHex("#101316"), background: undefined })).toBe(false);
  });
});

describe("presetName and accessibilityLabel", () => {
  it("names a preset color", () => {
    expect(presetName(asHex("#e0620b"))).toBe("Beak Orange");
    expect(presetName(asHex("#123456"))).toBeUndefined();
  });

  it("announces the repo, the preset color and the glyph, never a hex code", () => {
    expect(
      accessibilityLabel({
        name: "webshop",
        config: { background: asHex("#e0620b"), glyph: "toucan" },
      }),
    ).toBe("Toucan: webshop, Beak Orange toucan");
    expect(
      accessibilityLabel({
        name: "webshop",
        config: { background: asHex("#123456"), glyph: "heart" },
      }),
    ).toBe("Toucan: webshop, heart");
  });
});
