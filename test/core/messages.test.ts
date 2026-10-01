import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NO_COLOR, NO_COLOR_YET, clearConfirmation } from "../../src/core/messages.ts";

describe("folder messages", () => {
  it("never name the folder", () => {
    expect(NO_COLOR_YET).toBe("This folder has no Toucan color yet. Set a color first.");
    expect(NO_COLOR).toBe("This folder has no Toucan color.");
    expect(clearConfirmation(["glyph", "foreground"])).toEqual({
      message: "Clear Toucan's settings for this folder?",
      detail: "This removes its whole entry from toucan.repos, including glyph, foreground.",
    });
  });
});

/** Every `show*Message(…)` call in the extension's source, with its full argument text. */
function messageCalls(): { file: string; args: string }[] {
  const root = join(import.meta.dirname, "../../src");
  const files = readdirSync(root, { recursive: true, encoding: "utf8" }).filter(
    (file) => file.endsWith(".ts") && !file.startsWith("generated"),
  );
  return files.flatMap((file) => {
    const text = readFileSync(join(root, file), "utf8");
    return [...text.matchAll(/show(?:Information|Warning|Error)Message\(/g)].map((match) => {
      let depth = 1;
      let end = match.index + match[0].length;
      while (depth > 0 && end < text.length) {
        depth += text[end] === "(" ? 1 : text[end] === ")" ? -1 : 0;
        end++;
      }
      return { file, args: text.slice(match.index + match[0].length, end - 1) };
    });
  });
}

describe("notification texts", () => {
  // VS Code renders markdown links in notification messages, `command:` links
  // included, so text from the workspace (the folder name) must never reach
  // one: a folder named `[x](command:…)` would become a clickable command.
  it("never interpolate the folder name into a message", () => {
    const calls = messageCalls();
    expect(calls.length).toBeGreaterThanOrEqual(9);
    const offending = calls.filter(({ args }) =>
      /\$\{[^}]*\b(name|repoName|workspaceFolders)\b|(^|[(,]\s*)name\s*[,)]?\s*$|workspaceFolders/.test(
        args,
      ),
    );
    expect(offending).toEqual([]);
  });
});
