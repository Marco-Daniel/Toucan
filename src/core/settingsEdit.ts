import { isDeepStrictEqual } from "node:util";
// The ESM build: the package's UMD main loads its modules with a dynamic
// require that the bundler can't follow.
import {
  applyEdits,
  createScanner,
  findNodeAtLocation,
  modify,
  parse,
  parseTree,
} from "jsonc-parser/lib/esm/main.js";
import type { Edit, JSONScanner, ParseError } from "jsonc-parser/lib/esm/main.js";
import { isRecord } from "./records.ts";

const CRLF = "\r\n";
/** `globalStorage/<extension id>`, under a profile's folder. */
const STORAGE_SEGMENTS = 2;
/** `profiles/<profile id>`, under the user folder. */
const PROFILE_SEGMENTS = 2;

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
  const changed = changedKeys(current, next);
  if (changed.length === 0) {
    return { kind: "noop" };
  }

  // Edit as deep as both sides stay objects (a repo entry's fields), so
  // comments inside an entry survive a change to one of its fields.
  const paths = changedPaths(current, next, [key]);

  const formattingOptions = detectFormatting(text);
  let edited = text;
  // Each edit is planned on the text so far, so the order only decides where
  // new keys land: appended in the desired value's order.
  for (const { path, value } of paths) {
    const edits =
      value === undefined
        ? (removeLines(edited, path) ?? modify(edited, path, undefined, { formattingOptions }))
        : modify(edited, path, value, { formattingOptions });
    edited = applyEdits(edited, edits);
  }
  // Never trust an edit blindly: it must parse and hold exactly the result,
  // and keep every comment outside the values it replaced or removed.
  const result = parseSettings(edited);
  if (!result || !isDeepStrictEqual(result[key], next)) {
    return { kind: "fallback", reason: "the in-place edit didn't produce the expected value" };
  }
  if (
    !keepsComments(
      text,
      edited,
      paths.map(({ path }) => path),
    )
  ) {
    return { kind: "fallback", reason: "the in-place edit would drop a comment" };
  }
  return { kind: "edit", text: edited, changed };
}

/**
 * jsonc-parser's `SyntaxKind` values. It's an ambient const enum, which
 * `verbatimModuleSyntax` can't import.
 */
const SyntaxKind = {
  CommaToken: 5,
  LineCommentTrivia: 12,
  BlockCommentTrivia: 13,
  LineBreakTrivia: 14,
  Trivia: 15,
  EOF: 17,
} as const;

/** The next token's kind as a plain number, comparable with the values above. */
function scan(scanner: JSONScanner): number {
  return scanner.scan();
}

/**
 * Removes a property by deleting its whole lines, so comments on the lines
 * around it stay. jsonc-parser's own removal deletes everything from the end
 * of the previous value, including a trailing comment there or comment lines
 * above the property. A trailing comment on the removed line moves to the end
 * of the line before. No comma changes are needed: the property's own comma
 * goes with its lines, and a comma left on the previous property becomes a
 * trailing comma, which settings files allow.
 *
 * `undefined` when the property doesn't have its lines to itself; the caller
 * then uses jsonc-parser, and the comment check catches any loss.
 */
function removeLines(text: string, path: string[]): Edit[] | undefined {
  const root = parseTree(text);
  const node = root && findNodeAtLocation(root, path)?.parent;
  if (node?.type !== "property") {
    return undefined;
  }
  const lineStart = text.lastIndexOf("\n", node.offset - 1) + 1;
  if (text.slice(lineStart, node.offset).trim() !== "") {
    return undefined;
  }
  // After the value: an optional comma, then an optional comment, then the line break.
  const scanner = createScanner(text, false);
  scanner.setPosition(node.offset + node.length);
  let token = scan(scanner);
  if (token === SyntaxKind.Trivia) {
    token = scan(scanner);
  }
  if (token === SyntaxKind.CommaToken) {
    token = scan(scanner);
    if (token === SyntaxKind.Trivia) {
      token = scan(scanner);
    }
  }
  let comment = "";
  if (token === SyntaxKind.LineCommentTrivia || token === SyntaxKind.BlockCommentTrivia) {
    comment = tokenText(text, scanner);
    token = scan(scanner);
    if (token === SyntaxKind.Trivia) {
      token = scan(scanner);
    }
  }
  if (token !== SyntaxKind.LineBreakTrivia) {
    return undefined;
  }
  const lineEnd = scanner.getTokenOffset() + scanner.getTokenLength();
  const removal: Edit = { offset: lineStart, length: lineEnd - lineStart, content: "" };
  if (comment === "") {
    return [removal];
  }
  const previousBreak = lineStart - (text[lineStart - CRLF.length] === "\r" ? CRLF.length : 1);
  const previousStart = text.lastIndexOf("\n", previousBreak - 1) + 1;
  const endsInLineComment = comments(text).some(
    ({ offset, value }) =>
      value.startsWith("//") && offset >= previousStart && offset < previousBreak,
  );
  if (endsInLineComment) {
    // Appending would turn it into part of that comment: keep it on its own line.
    const indent = text.slice(lineStart, node.offset);
    const lineBreak = text.slice(scanner.getTokenOffset(), lineEnd);
    return [{ ...removal, content: `${indent}${comment}${lineBreak}` }];
  }
  // The end of the line before, without its line break and trailing spaces.
  let previousEnd = previousBreak;
  while (text[previousEnd - 1] === " " || text[previousEnd - 1] === "\t") {
    previousEnd--;
  }
  const move: Edit = {
    offset: previousEnd,
    length: previousBreak - previousEnd,
    content: ` ${comment}`,
  };
  return [move, removal];
}

/**
 * Whether `edited` still has every comment of `text` that isn't inside the
 * value of a changed property (those go with the value they annotate).
 */
function keepsComments(text: string, edited: string, paths: string[][]): boolean {
  const root = parseTree(text);
  const replaced = paths.flatMap((path) => {
    const node = root && findNodeAtLocation(root, path);
    return node ? [{ start: node.offset, end: node.offset + node.length }] : [];
  });
  const kept = comments(text)
    .filter(({ offset }) => !replaced.some(({ start, end }) => offset >= start && offset < end))
    .map(({ value }) => value);
  const remaining = comments(edited).map(({ value }) => value);
  for (const value of kept) {
    const index = remaining.indexOf(value);
    if (index === -1) {
      return false;
    }
    remaining.splice(index, 1);
  }
  return true;
}

function comments(text: string): { offset: number; value: string }[] {
  const scanner = createScanner(text, false);
  const found: { offset: number; value: string }[] = [];
  for (let token = scan(scanner); token !== SyntaxKind.EOF; token = scan(scanner)) {
    if (token === SyntaxKind.LineCommentTrivia || token === SyntaxKind.BlockCommentTrivia) {
      found.push({ offset: scanner.getTokenOffset(), value: tokenText(text, scanner) });
    }
  }
  return found;
}

/** The paths to every changed value, descending while both sides are objects. */
function changedPaths(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  prefix: string[],
): { path: string[]; value: unknown }[] {
  return changedKeys(before, after).flatMap((property) => {
    const from = before[property];
    const to = after[property];
    return isRecord(from) && isRecord(to)
      ? changedPaths(from, to, [...prefix, property])
      : [{ path: [...prefix, property], value: to }];
  });
}

/** The keys whose values differ between two objects, in `before`'s order, then new ones. */
function changedKeys(before: Record<string, unknown>, after: Record<string, unknown>): string[] {
  return [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(
    (property) => !isDeepStrictEqual(before[property], after[property]),
  );
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
  const profileDir = parts.slice(0, -STORAGE_SEGMENTS);
  const isProfile = profileDir.at(-PROFILE_SEGMENTS) === "profiles";
  const userDir = isProfile ? profileDir.slice(0, -PROFILE_SEGMENTS) : profileDir;
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

/** The scanner's current token as written; `getTokenValue()` also includes whitespace before a comment. */
function tokenText(text: string, scanner: JSONScanner): string {
  const start = scanner.getTokenOffset();
  return text.slice(start, start + scanner.getTokenLength());
}
