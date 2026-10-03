// import utils
import { isRecord } from "../../shared/records/records.util.ts";

// import types
import type { Glyph } from "@toucan/brand/glyphs.types.ts";
import type { Hex } from "../../shared/model/model.types.ts";

/**
 * Edits of the raw `toucan.repos` value, as the commands write it back to
 * user settings. They work on the raw value, not the parsed one, so fields
 * the user set by hand (overrides, invalid values they're still fixing) are
 * kept. Each returns a new object; `undefined` removes the setting.
 */
type Repos = Record<string, unknown>;

/** The raw `toucan.repos` value and the repo to edit in it. */
interface RepoEditArgs {
  raw: unknown;
  repo: string;
}

interface WithBackgroundArgs extends RepoEditArgs {
  background: Hex;
}

/** Sets the background; a string entry stays a string. */
export function withBackground({ raw, repo, background }: WithBackgroundArgs): Repos {
  const repos = copy(raw);
  const entry = Object.hasOwn(repos, repo) ? repos[repo] : undefined;
  set({ repos, repo, value: isRecord(entry) ? { ...entry, background } : background });
  return repos;
}

interface WithGlyphArgs extends RepoEditArgs {
  glyph: Glyph;
}

/** Sets the glyph, turning a string entry into an object. Needs an existing entry. */
export function withGlyph({ raw, repo, glyph }: WithGlyphArgs): Repos | undefined {
  const repos = copy(raw);
  const entry = Object.hasOwn(repos, repo) ? repos[repo] : undefined;
  if (typeof entry === "string") {
    set({ repos, repo, value: { background: entry, glyph } });
  } else if (isRecord(entry)) {
    set({ repos, repo, value: { ...entry, glyph } });
  } else {
    return undefined;
  }
  return repos;
}

/**
 * The fields of a repo's entry beyond its background: typed by hand, so
 * clearing the entry asks first. Empty for a bare color string.
 */
export function handEditedKeys({ raw, repo }: RepoEditArgs): string[] {
  const entry = isRecord(raw) && Object.hasOwn(raw, repo) ? raw[repo] : undefined;
  return isRecord(entry) ? Object.keys(entry).filter((key) => key !== "background") : [];
}

/** Removes the repo's entry, and the whole setting when nothing is left. */
export function withoutRepo({ raw, repo }: RepoEditArgs): Repos | undefined {
  const repos = copy(raw);
  delete repos[repo];
  return Object.keys(repos).length > 0 ? repos : undefined;
}

interface SetArgs {
  repos: Repos;
  repo: string;
  value: unknown;
}

/**
 * Sets an own property even for a name like "__proto__", which a plain
 * assignment would turn into a prototype change instead of a key.
 */
function set({ repos, repo, value }: SetArgs): void {
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
