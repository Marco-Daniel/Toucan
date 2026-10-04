// The screenshot script runs code in VS Code's windows and main process over
// DevTools (DevToolsSession.call). That code must be fixed text, every value
// passed as an argument: a value built into it could change what runs (code
// scanning's bad-code-sanitization). So every `fn:` and `on:` names an
// UPPER_SNAKE constant, and each of those is one literal with nothing spliced in.
// import libraries
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SCRIPTS = join(import.meta.dirname, "..", "..", "..", "scripts", "screenshots");
/** cdp.mts declares `fn` and `on` and hands them to DevTools; every other file supplies them. */
const SESSION = "cdp.mts";

/** A `fn:` or `on:` property and the expression it's given, a literal in it read whole. */
const CODE_PROPERTY = /\b(fn|on)\s*:\s*((?:`[^`]*`|[^,}\n`])+)/g;
const CONSTANT_NAME = /^[A-Z][A-Z0-9_]*$/;
/** An UPPER_SNAKE constant and its initializer, up to the `;` that ends it outside any literal. */
const CONSTANT =
  /\bconst\s+([A-Z][A-Z0-9_]*)\s*=\s*((?:`[^`]*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^;`"'])*);/g;
/** One string or template literal, alone. */
const SINGLE_LITERAL = /^(?:`[^`]*`|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')$/;

/** What makes the files' DevTools code anything but fixed text, one line per problem. */
function codeProblems(files: Readonly<Record<string, string>>): string[] {
  const constants = new Map(
    Object.values(files).flatMap((source) =>
      [...source.matchAll(CONSTANT)].map(({ 1: name = "", 2: value = "" }) => [name, value.trim()]),
    ),
  );
  return Object.entries(files).flatMap(([file, source]) =>
    [...source.matchAll(CODE_PROPERTY)].flatMap(({ 1: key, 2: given = "" }) => {
      const name = given.trim();
      if (!CONSTANT_NAME.test(name)) {
        return [`${file}: ${key}: ${name} isn't an UPPER_SNAKE constant`];
      }
      const value = constants.get(name);
      if (value === undefined) {
        return [`${file}: ${key}: ${name} has no const in the screenshot scripts`];
      }
      return SINGLE_LITERAL.test(value) && !value.includes("${")
        ? []
        : [`${file}: ${key}: ${name} isn't one literal with nothing spliced in`];
    }),
  );
}

describe("codeProblems", () => {
  it("accepts constants that are one literal each, passed by name", () => {
    expect(
      codeProblems({
        "a.mts": [
          'const FN = `function (title) { return document.title === title + "!"; }`;',
          'const ON = `require("electron")`;',
          "await page.call({ fn: FN, args: [title], on: ON });",
        ].join("\n"),
      }),
    ).toEqual([]);
  });

  it("catches code built from values, inline or in a constant, and a constant it can't find", () => {
    expect(
      codeProblems({
        "a.mts": [
          "const SPLICED = `return window.foo(${x})`;",
          'const ADDED = "function () { return " + x + "; }";',
          'const JOINED = ["function () {", x, "}"].join("");',
          "await page.call({ fn: `function () { return ${x}; }` });",
          "await page.call({ fn: SPLICED });",
          "await page.call({ fn: ADDED });",
          "await page.call({ fn: JOINED });",
          "await page.call({ fn: MISSING, on: target });",
        ].join("\n"),
      }),
    ).toEqual([
      "a.mts: fn: `function () { return ${x}; }` isn't an UPPER_SNAKE constant",
      "a.mts: fn: SPLICED isn't one literal with nothing spliced in",
      "a.mts: fn: ADDED isn't one literal with nothing spliced in",
      "a.mts: fn: JOINED isn't one literal with nothing spliced in",
      "a.mts: fn: MISSING has no const in the screenshot scripts",
      "a.mts: on: target isn't an UPPER_SNAKE constant",
    ]);
  });
});

describe("the screenshot scripts", () => {
  const files = Object.fromEntries(
    readdirSync(SCRIPTS)
      .filter((file) => file.endsWith(".mts") && file !== SESSION)
      .map((file) => [file, readFileSync(join(SCRIPTS, file), "utf8")]),
  );

  it("are all read, the session aside", () => {
    expect(Object.keys(files).length).toBe(9);
  });

  it("run only fixed code over DevTools", () => {
    expect(codeProblems(files)).toEqual([]);
  });

  it("send code to DevTools only from the session's call", () => {
    const session = readFileSync(join(SCRIPTS, SESSION), "utf8");
    expect([
      session.match(/functionDeclaration:\s*\w+/g),
      session.match(/expression:\s*\w+/g),
      Object.values(files).filter((source) => /Runtime\.(?:evaluate|callFunctionOn)/.test(source))
        .length,
    ]).toEqual([["functionDeclaration: fn"], ["expression: on"], 0]);
  });
});
