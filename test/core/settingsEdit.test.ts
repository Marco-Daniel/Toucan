import { describe, expect, it } from "vitest";
import {
  planEdit,
  settingInText,
  settingsFiles,
  viewReflects,
} from "../../src/core/settingsEdit.ts";

const KEY = "workbench.colorCustomizations";

const FILE = `{
  // my settings
  "editor.fontSize": 13,
  "${KEY}": {
    // keep my editor color
    "editor.background": "#101010",
    "commandCenter.background": "#aa0000", // Toucan's
  },
}
`;

const VIEW = { "editor.background": "#101010", "commandCenter.background": "#aa0000" };

/** The file's value, parsed independently of the code under test. */
const parseSettingsForTest = (text: string): unknown =>
  JSON.parse(text.replace(/\/\/.*$/gm, "").replace(/,(\s*[}\]])/g, "$1"));
const commentsOf = (text: string) => text.match(/\/\/.*$/gm) ?? [];

describe("planEdit", () => {
  it("edits only the changed keys and keeps every comment", () => {
    const plan = planEdit({
      text: FILE,
      key: KEY,
      view: VIEW,
      desired: {
        ...VIEW,
        "commandCenter.background": "#00bb00",
        "commandCenter.border": "#111111",
      },
    });
    expect(plan.kind).toBe("edit");
    if (plan.kind !== "edit") return;
    expect(plan.changed.toSorted()).toEqual(["commandCenter.background", "commandCenter.border"]);
    // Which line a trailing comment ends up on after an insert is jsonc-parser's
    // choice; Toucan's contract is the values, every comment, and the indentation.
    expect(parseSettingsForTest(plan.text)).toEqual({
      "editor.fontSize": 13,
      [KEY]: { ...VIEW, "commandCenter.background": "#00bb00", "commandCenter.border": "#111111" },
    });
    expect(commentsOf(plan.text)).toEqual([
      "// my settings",
      "// keep my editor color",
      "// Toucan's",
    ]);
    expect(plan.text).toContain('\n    "commandCenter.border": "#111111"');
  });

  it("clears Toucan's keys by whole lines, keeping the comments around them", () => {
    const text = `{
  "${KEY}": {
    "editor.background": "#101010", // keep my editor color
    // above Toucan's keys
    "commandCenter.background": "#aa0000",
    "commandCenter.border": "#111111"
  }
}
`;
    const plan = planEdit({
      text,
      key: KEY,
      view: { ...VIEW, "commandCenter.border": "#111111" },
      desired: { "editor.background": "#101010" },
    });
    expect(plan).toEqual({
      kind: "edit",
      text: `{
  "${KEY}": {
    "editor.background": "#101010", // keep my editor color
    // above Toucan's keys
  }
}
`,
      changed: ["commandCenter.background", "commandCenter.border"],
    });
  });

  it("moves a removed line's trailing comment to the end of the line before", () => {
    const plan = planEdit({
      text: FILE,
      key: KEY,
      view: VIEW,
      desired: { "editor.background": "#101010" },
    });
    expect(plan).toMatchObject({
      kind: "edit",
      text: `{
  // my settings
  "editor.fontSize": 13,
  "${KEY}": {
    // keep my editor color
    "editor.background": "#101010", // Toucan's
  },
}
`,
    });
  });

  it("keeps a removed line's comment on its own line when the line before ends in one", () => {
    const text = `{\n  "${KEY}": {\n    "a": "#000000", // mine\n    "b": "#111111", // moved here\n  },\n}\n`;
    const plan = planEdit({
      text,
      key: KEY,
      view: { a: "#000000", b: "#111111" },
      desired: { a: "#000000" },
    });
    expect(plan).toMatchObject({
      kind: "edit",
      text: `{\n  "${KEY}": {\n    "a": "#000000", // mine\n    // moved here\n  },\n}\n`,
    });
  });

  it("drops trailing spaces on the line before when it moves a comment there", () => {
    const text = `{\n  "${KEY}": {\n    "a": "#000000",   \n    "b": "#111111", // moved here\n  },\n}\n`;
    const plan = planEdit({
      text,
      key: KEY,
      view: { a: "#000000", b: "#111111" },
      desired: { a: "#000000" },
    });
    expect(plan).toMatchObject({
      kind: "edit",
      text: `{\n  "${KEY}": {\n    "a": "#000000", // moved here\n  },\n}\n`,
    });
  });

  it("leaves a property that shares its line to jsonc-parser, never removing its neighbor", () => {
    const text = `{\n  "${KEY}": {\n    "a": "#000000", "b": "#111111"\n  }\n}\n`;
    const plan = planEdit({
      text,
      key: KEY,
      view: { a: "#000000", b: "#111111" },
      desired: { a: "#000000" },
    });
    expect(plan.kind).toBe("edit");
    if (plan.kind !== "edit") return;
    expect(parseSettingsForTest(plan.text)).toEqual({ [KEY]: { a: "#000000" } });
  });

  it("gives back the original text after applying and then clearing", () => {
    const original = `{\r\n  "${KEY}": {\r\n    "editor.background": "#101010", // my editor color\r\n  },\r\n}\r\n`;
    const user = { "editor.background": "#101010" };
    const applied = {
      ...user,
      "commandCenter.background": "#aa0000",
      "commandCenter.border": "#111111",
    };
    const apply = planEdit({ text: original, key: KEY, view: user, desired: applied });
    expect(apply.kind).toBe("edit");
    if (apply.kind !== "edit") return;
    const clear = planEdit({ text: apply.text, key: KEY, view: applied, desired: user });
    expect(clear).toMatchObject({ kind: "edit", text: original });
  });

  it("falls back rather than drop a comment it can't keep", () => {
    // One line: Toucan's key doesn't have its lines to itself.
    const text = `{ "${KEY}": { "a": "#000000", /* mine */ "b": "#111111" } }\n`;
    const plan = planEdit({
      text,
      key: KEY,
      view: { a: "#000000", b: "#111111" },
      desired: { a: "#000000" },
    });
    expect(plan).toEqual({ kind: "fallback", reason: "the in-place edit would drop a comment" });
  });

  it("lets comments inside a removed value go with it", () => {
    const text = `{\n  "toucan.repos": {\n    // work\n    "webshop": {\n      "background": "#e0620b", // orange\n    },\n    "toucan": "#14939c", // mine\n  },\n}\n`;
    const plan = planEdit({
      text,
      key: "toucan.repos",
      view: { webshop: { background: "#e0620b" }, toucan: "#14939c" },
      desired: { toucan: "#14939c" },
    });
    expect(plan).toMatchObject({
      kind: "edit",
      text: `{\n  "toucan.repos": {\n    // work\n    "toucan": "#14939c", // mine\n  },\n}\n`,
    });
  });

  it("falls back instead of writing an edit that doesn't parse back as intended", () => {
    // A duplicate key: the edit changes the first "a", but the last one wins
    // on parse, so the result can never hold the new value.
    const text = `{\n  "${KEY}": {\n    "a": "#000000",\n    "a": "#000000"\n  }\n}\n`;
    const plan = planEdit({ text, key: KEY, view: { a: "#000000" }, desired: { a: "#111111" } });
    expect(plan).toEqual({
      kind: "fallback",
      reason: "the in-place edit didn't produce the expected value",
    });
  });

  it("is a no-op when nothing changes", () => {
    expect(planEdit({ text: FILE, key: KEY, view: VIEW, desired: VIEW })).toEqual({ kind: "noop" });
  });

  it("falls back when the key is absent from the file", () => {
    const plan = planEdit({ text: '{ "a": 1 }', key: KEY, view: undefined, desired: VIEW });
    expect(plan).toMatchObject({ kind: "fallback" });
  });

  it("falls back when the file differs from VS Code's view (another profile's file)", () => {
    const plan = planEdit({
      text: FILE,
      key: KEY,
      view: { "editor.background": "#202020" },
      desired: VIEW,
    });
    expect(plan).toMatchObject({ kind: "fallback" });
  });

  it("falls back on a file that doesn't parse", () => {
    expect(planEdit({ text: "{ oops", key: KEY, view: VIEW, desired: VIEW })).toMatchObject({
      kind: "fallback",
    });
  });

  it("keeps tab indentation and CRLF line endings", () => {
    const text = `{\r\n\t"${KEY}": {\r\n\t\t"a": "#000000"\r\n\t}\r\n}\r\n`;
    const plan = planEdit({
      text,
      key: KEY,
      view: { a: "#000000" },
      desired: { a: "#000000", b: "#111111" },
    });
    expect(plan.kind).toBe("edit");
    if (plan.kind !== "edit") return;
    expect(plan.text).toBe(
      `{\r\n\t"${KEY}": {\r\n\t\t"a": "#000000",\r\n\t\t"b": "#111111"\r\n\t}\r\n}\r\n`,
    );
  });

  it("writes a new object value with the file's CRLF line endings", () => {
    const text = `{\r\n  "toucan.repos": {\r\n    "a": "#000000"\r\n  }\r\n}\r\n`;
    const plan = planEdit({
      text,
      key: "toucan.repos",
      view: { a: "#000000" },
      desired: { a: { background: "#000000", glyph: "star" } },
    });
    expect(plan.kind).toBe("edit");
    if (plan.kind !== "edit") return;
    expect(plan.text.replaceAll("\r\n", "")).not.toContain("\n");
  });

  it("replaces a changed repo entry without touching the others", () => {
    const text = `{\n  "toucan.repos": {\n    // work\n    "webshop": "#e0620b",\n    "toucan": { "background": "#14939c" } // mine\n  }\n}\n`;
    const view = { webshop: "#e0620b", toucan: { background: "#14939c" } };
    const plan = planEdit({
      text,
      key: "toucan.repos",
      view,
      desired: { ...view, webshop: { background: "#e0620b", glyph: "star" } },
    });
    expect(plan.kind).toBe("edit");
    if (plan.kind !== "edit") return;
    expect(plan.changed).toEqual(["webshop"]);
    expect(plan.text).toBe(
      `{\n  "toucan.repos": {\n    // work\n    "webshop": {\n      "background": "#e0620b",\n      "glyph": "star"\n    },\n    "toucan": { "background": "#14939c" } // mine\n  }\n}\n`,
    );
  });
});

describe("viewReflects", () => {
  it("checks only the changed properties", () => {
    const desired = { a: 1, b: 2 };
    expect(
      viewReflects({ a: 1, b: 2, other: "changed by someone else" }, desired, ["a", "b"]),
    ).toBe(true);
    expect(viewReflects({ a: 1, b: 3 }, desired, ["a", "b"])).toBe(false);
  });

  it("treats removed properties as reflected when they're gone", () => {
    expect(viewReflects({}, undefined, ["a"])).toBe(true);
    expect(viewReflects(undefined, undefined, ["a"])).toBe(true);
    expect(viewReflects({ a: 1 }, undefined, ["a"])).toBe(false);
  });
});

describe("settingsFiles", () => {
  it("derives both files for the default profile", () => {
    expect(settingsFiles("/home/me/.config/Code/User/globalStorage/marco-daniel.toucan")).toEqual({
      profile: "/home/me/.config/Code/User/settings.json",
      defaultProfile: "/home/me/.config/Code/User/settings.json",
    });
  });

  it("derives both files for a non-default profile", () => {
    expect(
      settingsFiles("/home/me/.config/Code/User/profiles/-6a1f/globalStorage/marco-daniel.toucan"),
    ).toEqual({
      profile: "/home/me/.config/Code/User/profiles/-6a1f/settings.json",
      defaultProfile: "/home/me/.config/Code/User/settings.json",
    });
  });

  it("handles Windows paths", () => {
    expect(
      settingsFiles(
        "C:\\Users\\me\\AppData\\Roaming\\Code\\User\\globalStorage\\marco-daniel.toucan",
      ),
    ).toEqual({
      profile: "C:\\Users\\me\\AppData\\Roaming\\Code\\User\\settings.json",
      defaultProfile: "C:\\Users\\me\\AppData\\Roaming\\Code\\User\\settings.json",
    });
  });
});

describe("planEdit, clearing every key", () => {
  // Keeps the (now empty) object: removing the key would drop comments inside it (0017).
  it("leaves an empty object (closing brace on its own line) in a plain file", () => {
    const text = `{\n  "${KEY}": {\n    "commandCenter.background": "#aa0000"\n  }\n}\n`;
    const plan = planEdit({
      text,
      key: KEY,
      view: { "commandCenter.background": "#aa0000" },
      desired: undefined,
    });
    expect(plan).toEqual({
      kind: "edit",
      text: `{\n  "${KEY}": {\n  }\n}\n`,
      changed: ["commandCenter.background"],
    });
  });

  it("keeps CRLF line endings", () => {
    const text = `{\r\n  "${KEY}": {\r\n    "a": "#000000",\r\n    "b": "#111111"\r\n  }\r\n}\r\n`;
    const plan = planEdit({
      text,
      key: KEY,
      view: { a: "#000000", b: "#111111" },
      desired: undefined,
    });
    expect(plan).toEqual({
      kind: "edit",
      text: `{\r\n  "${KEY}": {\r\n  }\r\n}\r\n`,
      changed: ["a", "b"],
    });
  });
});

describe("settingInText", () => {
  it("reads the setting from commented JSON", () => {
    expect(settingInText(`{\n  // c\n  "${KEY}": { "a": 1 },\n}`, KEY)).toEqual({
      value: { a: 1 },
    });
  });

  it("reports an absent key as an undefined value", () => {
    expect(settingInText("{}", KEY)).toEqual({ value: undefined });
  });

  it("gives nothing for text that doesn't parse", () => {
    expect(settingInText("{ oops", KEY)).toBeUndefined();
  });

  it("gives nothing for a file that isn't an object", () => {
    expect(settingInText(`["${KEY}"]`, KEY)).toBeUndefined();
    expect(settingInText("null", KEY)).toBeUndefined();
  });
});
