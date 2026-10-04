// The screenshot script runs code in VS Code's windows and main process over
// DevTools. That code must be fixed text, with every value passed as an
// argument: a value spliced into it could change what runs (code scanning's
// bad-code-sanitization).
// import libraries
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SCRIPTS = join(import.meta.dirname, "..", "..", "..", "scripts", "screenshots");

/** A template literal, with any `${…}` in it. */
const TEMPLATE = /`(?:\\[\s\S]|\$\{[^}]*\}|[^`\\])*`/g;
/** What hands text to DevTools as code. */
const CODE_SINK = /(?:\b(?:fn|on|expression|functionDeclaration)\s*:|\b(?:evaluate|call)\s*\()\s*$/;
/** Text that reads as code rather than a message. */
const CODE_TEXT = /^`\s*(?:function\b|\(|\[\.\.\.)|\bdocument\.|\brequire\(/;

/** Each template literal that splices a value into code: one handed to DevTools, or one that reads as code. */
function splicedCode(source: string): string[] {
  return [...source.matchAll(TEMPLATE)].flatMap(({ 0: text, index }) =>
    text.includes("${") && (CODE_SINK.test(source.slice(0, index)) || CODE_TEXT.test(text))
      ? [text]
      : [],
  );
}

describe("splicedCode", () => {
  it("finds a value spliced into code handed to DevTools, or into text that reads as code", () => {
    expect(
      splicedCode(
        [
          "page.evaluate(`document.title === ${JSON.stringify(title)}`);",
          "page.call({ fn: `function () { return ${size}; }` });",
          "const LABEL = `document.querySelector('${ITEM}')`;",
          "main.call({ fn: FOCUS, on: `require(${name})` });",
        ].join("\n"),
      ),
    ).toEqual([
      "`document.title === ${JSON.stringify(title)}`",
      "`function () { return ${size}; }`",
      "`document.querySelector('${ITEM}')`",
      "`require(${name})`",
    ]);
  });

  it("leaves fixed code and messages with values alone", () => {
    expect(
      splicedCode(
        [
          "const FN = `function (title) { return document.title === title; }`;",
          "throw new Error(`No box for ${selector}`);",
          "await window.waitFor({ what: `the ${file} tab`, call: { fn: TAB, args: [file] } });",
        ].join("\n"),
      ),
    ).toEqual([]);
  });
});

describe("the screenshot scripts", () => {
  const files = readdirSync(SCRIPTS).filter((file) => file.endsWith(".mts"));

  it("are all scanned", () => {
    expect(files.length).toBe(10);
  });

  it.each(files)("%s splices no value into code", (file) => {
    expect(splicedCode(readFileSync(join(SCRIPTS, file), "utf8"))).toEqual([]);
  });
});
