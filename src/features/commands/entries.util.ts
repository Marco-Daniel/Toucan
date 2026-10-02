import type { Glyph, Hex } from "../../shared/model/model.consts.ts";
import { isRecord } from "../../shared/records/records.util.ts";

/**
 * Edits of the raw `toucan.repos` value, as the commands write it back to
 * user settings. They work on the raw value, not the parsed one, so fields
 * the user set by hand (overrides, invalid values they're still fixing) are
 * kept. Each returns a new object; `undefined` removes the setting.
 */
type Repos = Record<string, unknown>;

/** Sets the background; a string entry stays a string. */
export function withBackground(raw: unknown, repo: string, background: Hex): Repos {
  const repos = copy(raw);
  const entry = Object.hasOwn(repos, repo) ? repos[repo] : undefined;
  set(repos, repo, isRecord(entry) ? { ...entry, background } : background);
  return repos;
}

/** Sets the glyph, turning a string entry into an object. Needs an existing entry. */
export function withGlyph(raw: unknown, repo: string, glyph: Glyph): Repos | undefined {
  const repos = copy(raw);
  const entry = Object.hasOwn(repos, repo) ? repos[repo] : undefined;
  if (typeof entry === "string") {
    set(repos, repo, { background: entry, glyph });
  } else if (isRecord(entry)) {
    set(repos, repo, { ...entry, glyph });
  } else {
    return undefined;
  }
  return repos;
}

/**
 * The fields of a repo's entry beyond its background: typed by hand, so
 * clearing the entry asks first. Empty for a bare color string.
 */
export function handEditedKeys(raw: unknown, repo: string): string[] {
  const entry = isRecord(raw) && Object.hasOwn(raw, repo) ? raw[repo] : undefined;
  return isRecord(entry) ? Object.keys(entry).filter((key) => key !== "background") : [];
}

/** Removes the repo's entry, and the whole setting when nothing is left. */
export function withoutRepo(raw: unknown, repo: string): Repos | undefined {
  const repos = copy(raw);
  delete repos[repo];
  return Object.keys(repos).length > 0 ? repos : undefined;
}

/**
 * Sets an own property even for a name like "__proto__", which a plain
 * assignment would turn into a prototype change instead of a key.
 */
function set(repos: Repos, repo: string, value: unknown): void {
  Object.defineProperty(repos, repo, {
    value,
    enumerable: true,
    writable: true,
    configurable: true,
  });
}

function copy(raw: unknown): Repos {
  return isRecord(raw) ? Object.fromEntries(Object.entries(raw)) : {};
}
