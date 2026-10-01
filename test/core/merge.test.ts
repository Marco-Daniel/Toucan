import { describe, expect, it } from "vitest";
import { customizationsFor, hasToucanKeys, mergeCustomizations } from "../../src/core/merge.ts";
import type { CommandCenterColors, Hex } from "../../src/core/model.ts";

const hex = (value: string) => value as Hex;

const colors = (background: string): CommandCenterColors => {
  return {
    background: hex(background),
    foreground: hex("#ffffff"),
    activeBackground: hex("#222222"),
    activeForeground: hex("#ffffff"),
    border: hex("#333333"),
    activeBorder: hex("#333333"),
    inactiveForeground: hex("#ffffff99"),
    inactiveBorder: hex("#33333380"),
  };
};

const prefixed = (set: CommandCenterColors) =>
  Object.fromEntries(Object.entries(set).map(([key, value]) => [`commandCenter.${key}`, value]));

describe("mergeCustomizations", () => {
  it("adds Toucan's keys to an unset setting", () => {
    expect(mergeCustomizations(undefined, colors("#000000"))).toEqual({
      changed: true,
      value: prefixed(colors("#000000")),
    });
  });

  it("keeps every other key, including theme-scoped blocks", () => {
    const current = {
      "titleBar.activeBackground": "#123456",
      "[Default Dark Modern]": { "commandCenter.background": "#abcdef" },
      "statusBar.background": "#654321",
    };
    const result = mergeCustomizations(current, colors("#000000"));
    expect(result).toEqual({
      changed: true,
      value: { ...current, ...prefixed(colors("#000000")) },
    });
  });

  it("replaces existing commandCenter keys, including ones Toucan doesn't derive", () => {
    const current = {
      "commandCenter.background": "#ff0000",
      "commandCenter.debuggingBackground": "#00ff00",
      "editor.background": "#111111",
    };
    const result = mergeCustomizations(current, colors("#000000"));
    expect(result).toEqual({
      changed: true,
      value: { "editor.background": "#111111", ...prefixed(colors("#000000")) },
    });
  });

  it("reports no change when the keys already match, in any order", () => {
    const current = {
      "editor.background": "#111111",
      ...Object.fromEntries(Object.entries(prefixed(colors("#000000"))).toReversed()),
    };
    expect(mergeCustomizations(current, colors("#000000"))).toEqual({ changed: false });
  });

  it("reports a change when one value differs", () => {
    const current = { ...prefixed(colors("#000000")), "commandCenter.border": "#444444" };
    expect(mergeCustomizations(current, colors("#000000")).changed).toBe(true);
  });

  it("removes Toucan's keys and keeps the rest when clearing", () => {
    const current = { "editor.background": "#111111", ...prefixed(colors("#000000")) };
    expect(mergeCustomizations(current, undefined)).toEqual({
      changed: true,
      value: { "editor.background": "#111111" },
    });
  });

  it("removes the setting when clearing leaves it empty", () => {
    expect(mergeCustomizations(prefixed(colors("#000000")), undefined)).toEqual({
      changed: true,
      value: undefined,
    });
  });

  it.each([[undefined], [{}], [{ "editor.background": "#111111" }]])(
    "reports no change when clearing %j",
    (current) => {
      expect(mergeCustomizations(current, undefined)).toEqual({ changed: false });
    },
  );

  it.each([["#000000"], [["x"]], [null], [42]])(
    "leaves a malformed setting %j alone",
    (current) => {
      expect(mergeCustomizations(current, colors("#000000"))).toEqual({ changed: false });
      expect(mergeCustomizations(current, undefined)).toEqual({ changed: false });
    },
  );

  it("does not mutate the current value", () => {
    const current = { "commandCenter.background": "#ff0000", "editor.background": "#111111" };
    const copy = structuredClone(current);
    mergeCustomizations(current, colors("#000000"));
    mergeCustomizations(current, undefined);
    expect(current).toEqual(copy);
  });

  it("keeps a __proto__ key as plain data", () => {
    const current = JSON.parse('{"__proto__": {"polluted": true}, "editor.background": "#111"}');
    const result = mergeCustomizations(current, colors("#000000"));
    expect(result.changed && Object.keys(result.value ?? {})).toContain("__proto__");
    expect(({} as Record<string, unknown>)["polluted"]).toBeUndefined();
  });
});

describe("hasToucanKeys", () => {
  it("detects any commandCenter key", () => {
    expect(hasToucanKeys({ "commandCenter.border": "#fff" })).toBe(true);
    expect(hasToucanKeys({ "editor.background": "#fff" })).toBe(false);
    expect(hasToucanKeys(undefined)).toBe(false);
    expect(hasToucanKeys("commandCenter.border")).toBe(false);
  });
});

describe("customizationsFor", () => {
  it("merges Toucan's keys onto the current value", () => {
    expect(customizationsFor({ "editor.background": "#111111" }, colors("#000000"))).toEqual({
      value: {
        "editor.background": "#111111",
        "commandCenter.background": "#000000",
        "commandCenter.foreground": "#ffffff",
        "commandCenter.activeBackground": "#222222",
        "commandCenter.activeForeground": "#ffffff",
        "commandCenter.border": "#333333",
        "commandCenter.activeBorder": "#333333",
        "commandCenter.inactiveForeground": "#ffffff99",
        "commandCenter.inactiveBorder": "#33333380",
      },
    });
  });

  it("returns the current value unchanged when it already matches", () => {
    const current = { "editor.background": "#111111", ...prefixed(colors("#000000")) };
    expect(customizationsFor(current, colors("#000000"))).toEqual({ value: current });
  });

  it("clears to undefined when only Toucan's keys were there", () => {
    expect(customizationsFor(prefixed(colors("#000000")), undefined)).toEqual({ value: undefined });
  });

  it("leaves a malformed value alone", () => {
    expect(customizationsFor("oops", colors("#000000"))).toBeUndefined();
    expect(customizationsFor(["x"], undefined)).toBeUndefined();
  });
});
