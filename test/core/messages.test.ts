import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as messages from "../../src/core/messages.ts";

describe("messages", () => {
  it("never name the folder", () => {
    expect(messages.NO_COLOR_YET).toBe("This folder has no Toucan color yet. Set a color first.");
    expect(messages.NO_COLOR).toBe("This folder has no Toucan color.");
    expect(messages.CLEAR_CONFIRMATION).toBe("Clear Toucan's settings for this folder?");
  });

  it("build the texts that carry details", () => {
    expect(messages.clearDetail(["glyph", "foreground"])).toBe(
      "This removes its whole entry from toucan.repos, including glyph, foreground.",
    );
    expect(messages.AGENTS_CONTROL_OFFER).toBe(
      'Toucan\'s color needs the classic search bar. Set chat.agentsControl.enabled to "badge"?',
    );
    expect(messages.saveFailed(new Error("EACCES"))).toBe(
      "Toucan couldn't save toucan.repos: Error: EACCES",
    );
    expect(messages.titleChangeFailed(new Error("EACCES"))).toBe(
      "Toucan couldn't change window.title: Error: EACCES",
    );
  });
});

/** Splits off the first top-level argument, skipping strings and nested brackets. */
function firstArgument(args: string): string {
  let depth = 0;
  for (let i = 0; i < args.length; i++) {
    const char = args[i];
    if (char === '"' || char === "'" || char === "`") {
      const close = args.indexOf(char, i + 1);
      i = close === -1 ? args.length : close;
    } else if ("([{".includes(char!)) {
      depth++;
    } else if (")]}".includes(char!)) {
      depth--;
    } else if (char === "," && depth === 0) {
      return args.slice(0, i).trim();
    }
  }
  return args.trim();
}

/** The first argument of every `show*Message(…)` call in the extension's source. */
function messageArguments(): { file: string; text: string }[] {
  const root = join(import.meta.dirname, "../../src");
  const files = readdirSync(root, { recursive: true, encoding: "utf8" }).filter(
    (file) => file.endsWith(".ts") && !file.startsWith("generated"),
  );
  return files.flatMap((file) => {
    const source = readFileSync(join(root, file), "utf8");
    return [...source.matchAll(/show(?:Information|Warning|Error)Message\(/g)].map((match) => {
      let depth = 1;
      let end = match.index + match[0].length;
      while (depth > 0 && end < source.length) {
        depth += source[end] === "(" ? 1 : source[end] === ")" ? -1 : 0;
        end++;
      }
      return { file, text: firstArgument(source.slice(match.index + match[0].length, end - 1)) };
    });
  });
}

/** A plain literal (no interpolation), or a constant or builder call from core/messages.ts. */
function allowed(text: string): boolean {
  if (/^"(?:[^"\\]|\\.)*"$|^'(?:[^'\\]|\\.)*'$|^`[^`$]*`$/.test(text)) {
    return true;
  }
  const [, name, args = ""] = /^(\w+)(\(.*\))?$/s.exec(text) ?? [];
  // A builder's arguments may be errors or settings fields, never the folder name.
  const namesFolder = /\b(name|repoName|workspaceFolders)\b/.test(args);
  return name !== undefined && Object.hasOwn(messages, name) && !namesFolder;
}

describe("notification texts", () => {
  // VS Code renders markdown links in notification messages, `command:` links
  // included, so workspace text (the folder name) must never reach one. Only
  // a plain literal or a text from core/messages.ts is allowed: that rules out
  // interpolation, concatenation and variables in one go.
  it("come only from plain literals or core/messages.ts", () => {
    const calls = messageArguments();
    expect(calls.length).toBeGreaterThanOrEqual(9);
    expect(calls.filter(({ text }) => !allowed(text))).toEqual([]);
  });
});
