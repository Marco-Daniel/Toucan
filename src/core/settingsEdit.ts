import { isDeepStrictEqual } from "node:util";
// The ESM build: the package's UMD main loads its modules with a dynamic
// require that the bundler can't follow.
import { applyEdits, modify, parse, type ParseError } from "jsonc-parser/lib/esm/main.js";
import { isRecord } from "./records.ts";

/**
 * Plans an in-place edit of one setting in the user settings file, keeping
 * comments and formatting (0017). The adapter does the file I/O.
 */
export type EditPlan =
  | { kind: "noop" }
  | {
      kind: "edit";
      /** The whole new file text. */
      text: string;
      /** Top-level properties of the setting's value that change. */
      changed: string[];
    }
  | { kind: "fallback"; reason: string };

export interface EditInput {
  /** The settings file's text. */
  text: string;
  /** The setting's key, e.g. "workbench.colorCustomizations". */
  key: string;
  /** VS Code's view of the user value (`inspect(key).globalValue`). */
  view: unknown;
  /** The value to end up with; `undefined` clears every property. */
  desired: Record<string, unknown> | undefined;
}

/** A settings file's top-level object, or `undefined` when the text doesn't parse as one. */
function parseSettings(text: string): Record<string, unknown> | undefined {
  const errors: ParseError[] = [];
  const settings = parse(text, errors, { allowTrailingComma: true }) as unknown;
  return errors.length === 0 && isRecord(settings) ? settings : undefined;
}

/** The setting's value in a settings file's text, or `undefined` when the text doesn't parse. */
export function settingInText(text: string, key: string): { value: unknown } | undefined {
  const settings = parseSettings(text);
  return settings && { value: settings[key] };
}

export function planEdit({ text, key, view, desired }: EditInput): EditPlan {
  const settings = parseSettings(text);
  if (!settings) {
    return { kind: "fallback", reason: "the settings file doesn't parse" };
  }
  const current = settings[key];
  // Absent: no comments to keep, and update() is always right.
  if (current === undefined) {
    return { kind: "fallback", reason: `${key} isn't in the file` };
  }
  // Not proof the file is this window's (0017 step 2); the adapter's
  // verify-and-revert covers the rest.
  if (!isRecord(current) || !isDeepStrictEqual(current, view)) {
    return { kind: "fallback", reason: `${key} in the file differs from VS Code's view` };
  }

  const next = desired ?? {};
  const changed = [...new Set([...Object.keys(current), ...Object.keys(next)])].filter(
    (property) => !isDeepStrictEqual(current[property], next[property]),
  );
  if (changed.length === 0) {
    return { kind: "noop" };
  }

  const formattingOptions = detectFormatting(text);
  let edited = text;
  // Removals from the end first: removing a property before a trailing comma
  // and comment can otherwise leave a stray comma behind.
  for (const property of changed.toReversed()) {
    edited = applyEdits(
      edited,
      modify(edited, [key, property], next[property], { formattingOptions }),
    );
  }
  // Never trust an edit blindly: it must parse and hold exactly the result.
  const result = parseSettings(edited);
  if (!result || !isDeepStrictEqual(result[key], next)) {
    return { kind: "fallback", reason: "the in-place edit didn't produce the expected value" };
  }
  return { kind: "edit", text: edited, changed };
}

/** Whether VS Code's view shows the edited properties (others may change concurrently). */
export function viewReflects(
  view: unknown,
  desired: Record<string, unknown> | undefined,
  changed: readonly string[],
): boolean {
  const seen = isRecord(view) ? view : {};
  return changed.every((property) => isDeepStrictEqual(seen[property], desired?.[property]));
}

/**
 * The user settings files, derived from the extension's global storage path:
 * `<User>/globalStorage/<ext>` or `<User>/profiles/<id>/globalStorage/<ext>`.
 * `profile` is this profile's file (a guess, see 0017); `defaultProfile` is
 * where VS Code keeps application-scoped settings such as `toucan.repos`.
 */
export function settingsFiles(globalStoragePath: string): {
  profile: string;
  defaultProfile: string;
} {
  const separator =
    globalStoragePath.includes("\\") && !globalStoragePath.includes("/") ? "\\" : "/";
  const parts = globalStoragePath.split(separator);
  const profileDir = parts.slice(0, -2);
  const isProfile = profileDir.at(-2) === "profiles";
  const userDir = isProfile ? profileDir.slice(0, -2) : profileDir;
  return {
    profile: [...profileDir, "settings.json"].join(separator),
    defaultProfile: [...userDir, "settings.json"].join(separator),
  };
}

/** The file's indentation. Line endings need nothing: jsonc-parser reuses the file's own. */
function detectFormatting(text: string): { insertSpaces: boolean; tabSize: number } {
  const indent = /^([ \t]+)\S/m.exec(text)?.[1] ?? "  ";
  return indent.startsWith("\t")
    ? { insertSpaces: false, tabSize: 1 }
    : { insertSpaces: true, tabSize: indent.length };
}
