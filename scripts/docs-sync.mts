// `node scripts/docs-sync.mts [--since <ref>]`: what changed since the last
// docs sync, for the /docs-sync skill to look up in the docs. It prints one
// JSON object: the changed files, the script names, setting keys and command
// ids of every package.json, ADR status changes and exported names in the
// root's and each package's src/ and scripts/.
// The ref defaults to the `docs-sync/last` tag. Without it, or when the diff
// can't be computed (a shallow clone missing the old commit, say), it asks for
// a full sweep instead. It only reads git: it never fetches, tags or pushes.
// import libraries
import { spawnSync } from "node:child_process";
import { posix } from "node:path";

// import utils
import { errorText, tryCatchSync } from "../apps/extension/src/shared/async/tryCatch.util.ts";
import { isRecord } from "../apps/extension/src/shared/records/records.util.ts";

const DEFAULT_SINCE = "docs-sync/last";

/** Where `--since`'s value sits after the flag. */
const VALUE_OFFSET = 1;
/** After `node` and this script come the arguments. */
const FIRST_ARGUMENT = 2;
/** Indent of the printed JSON. */
const JSON_INDENT = 2;

export interface FileChanges {
  added: string[];
  removed: string[];
  renamed: { from: string; to: string }[];
  modified: string[];
}

export interface NameChanges {
  added: string[];
  removed: string[];
}

export interface CommandRetitle {
  command: string;
  from: string | null;
  to: string | null;
}

export interface AdrStatusChange {
  adr: string;
  from: string | null;
  to: string | null;
}

interface DocsSyncReport {
  since: string;
  head: string;
  full: false;
  files: FileChanges;
  scripts: NameChanges & { changed: string[] };
  settings: NameChanges & { changed: string[] };
  commands: NameChanges & { retitled: CommandRetitle[] };
  adrStatuses: AdrStatusChange[];
  symbols: NameChanges;
}

interface FullSweep {
  since: null;
  head: string;
  full: true;
  reason: string;
}

/** The files `git diff --name-status -M` lists, by kind of change. */
export function parseNameStatus(text: string): FileChanges {
  const changes: FileChanges = { added: [], removed: [], renamed: [], modified: [] };
  for (const line of text.split("\n")) {
    const [status = "", path = "", to = ""] = line.split("\t");
    if (status === "A") {
      changes.added.push(path);
    } else if (status === "D") {
      changes.removed.push(path);
    } else if (status.startsWith("R")) {
      changes.renamed.push({ from: path, to });
    } else if (status !== "") {
      // M, and T for a type change (a file that became a symlink, say).
      changes.modified.push(path);
    }
  }
  return changes;
}

interface BeforeAfter<T> {
  before: T;
  after: T;
}

/** The names only in `after`, and those only in `before`, each sorted. */
function diffNames({ before, after }: BeforeAfter<readonly string[]>): NameChanges {
  return {
    added: after.filter((name) => !before.includes(name)).toSorted(),
    removed: before.filter((name) => !after.includes(name)).toSorted(),
  };
}

/** `package.json`'s `scripts`, by name. */
function scriptsOf(manifest: unknown): Record<string, unknown> {
  return isRecord(manifest) && isRecord(manifest["scripts"]) ? manifest["scripts"] : {};
}

/** The `package.json` script names added, removed, or run with another command. */
export function diffScripts({
  before,
  after,
}: BeforeAfter<unknown>): NameChanges & { changed: string[] } {
  const old = scriptsOf(before);
  const now = scriptsOf(after);
  return {
    ...diffNames({ before: Object.keys(old), after: Object.keys(now) }),
    changed: Object.keys(now)
      .filter((name) => Object.hasOwn(old, name) && old[name] !== now[name])
      .toSorted(),
  };
}

/** The fields of a setting whose change the docs may need to follow. */
const SETTING_FIELDS = [
  "default",
  "enum",
  "enumDescriptions",
  "scope",
  "type",
  "description",
  "markdownDescription",
] as const;

/** The settings in `contributes.configuration` (a single object or a list of them), by key. */
function settingsOf(manifest: unknown): Map<string, unknown> {
  const contributes = isRecord(manifest) ? manifest["contributes"] : undefined;
  const configuration = isRecord(contributes) ? contributes["configuration"] : undefined;
  const sections = Array.isArray(configuration) ? configuration : [configuration];
  return new Map(
    sections.flatMap((section) =>
      isRecord(section) && isRecord(section["properties"])
        ? Object.entries(section["properties"])
        : [],
    ),
  );
}

/** Whether any of a setting's fields the docs follow differs, compared as JSON. */
function isSettingChanged({ before, after }: BeforeAfter<unknown>): boolean {
  const old = isRecord(before) ? before : {};
  const now = isRecord(after) ? after : {};
  return SETTING_FIELDS.some((field) => JSON.stringify(old[field]) !== JSON.stringify(now[field]));
}

/** The setting keys added to or removed from `contributes.configuration`, or defined differently. */
export function diffSettings({
  before,
  after,
}: BeforeAfter<unknown>): NameChanges & { changed: string[] } {
  const old = settingsOf(before);
  const now = settingsOf(after);
  return {
    ...diffNames({ before: [...old.keys()], after: [...now.keys()] }),
    changed: [...now.keys()]
      .filter(
        (key) => old.has(key) && isSettingChanged({ before: old.get(key), after: now.get(key) }),
      )
      .toSorted(),
  };
}

/** A command's label in the Command Palette, `Category: Title`, or the bare title without a category. */
function commandLabel(entry: Record<string, unknown>): string | null {
  const { title, category } = entry;
  if (typeof title !== "string") {
    return null;
  }
  return typeof category === "string" ? `${category}: ${title}` : title;
}

/** The commands in `contributes.commands`: each id's label, or `null` without a title. */
function commandsOf(manifest: unknown): Map<string, string | null> {
  const contributes = isRecord(manifest) ? manifest["contributes"] : undefined;
  const commands = isRecord(contributes) ? contributes["commands"] : undefined;
  return new Map(
    Array.isArray(commands)
      ? commands.flatMap((entry) =>
          isRecord(entry) && typeof entry["command"] === "string"
            ? [[entry["command"], commandLabel(entry)]]
            : [],
        )
      : [],
  );
}

/** The command ids added to or removed from `contributes.commands`, and those with a new label (title or category). */
export function diffCommands({
  before,
  after,
}: BeforeAfter<unknown>): NameChanges & { retitled: CommandRetitle[] } {
  const old = commandsOf(before);
  const now = commandsOf(after);
  return {
    ...diffNames({ before: [...old.keys()], after: [...now.keys()] }),
    retitled: [...now.keys()].toSorted().flatMap((command) => {
      const from = old.get(command);
      const to = now.get(command) ?? null;
      return from === undefined || from === to ? [] : [{ command, from, to }];
    }),
  };
}

/** The ADRs whose Status line changed, appeared or went, by number; `null` where there was none. */
export function adrStatusChanges({
  before,
  after,
}: BeforeAfter<ReadonlyMap<string, string>>): AdrStatusChange[] {
  const numbers = [...new Set([...before.keys(), ...after.keys()])].toSorted();
  return numbers.flatMap((adr) => {
    const from = before.get(adr) ?? null;
    const to = after.get(adr) ?? null;
    return from === to ? [] : [{ adr, from, to }];
  });
}

/** An ADR file's Status line value, e.g. "Accepted", or `undefined` without one. */
export function adrStatus(text: string): string | undefined {
  return /^- Status: (.+)$/m.exec(text)?.[1]?.trim();
}

const DECLARATION =
  /^export\s+(?:declare\s+)?(?:default\s+)?(?:abstract\s+)?(?:async\s+)?(?:function\*?|const|let|var|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)/gm;
const EXPORT_LIST = /^export\s+(?:type\s+)?\{([^}]*)\}/gm;

/** The names a module exports: declarations, plus any `export { a, b as c }` list. */
export function exportedSymbols(text: string): string[] {
  const names = [...text.matchAll(DECLARATION)].map((match) => match[1] ?? "");
  for (const [, list = ""] of text.matchAll(EXPORT_LIST)) {
    for (const entry of list.split(",")) {
      const name = entry
        .trim()
        .split(/\s+as\s+/)
        .at(-1)
        ?.replace(/^type\s+/, "");
      if (name) {
        names.push(name);
      }
    }
  }
  return [...new Set(names)].toSorted();
}

/** The exported names that appeared or went across the given files, compared by name. */
export function diffSymbols({ before, after }: BeforeAfter<readonly string[]>): NameChanges {
  return diffNames({
    before: [...new Set(before.flatMap(exportedSymbols))],
    after: [...new Set(after.flatMap(exportedSymbols))],
  });
}

/** Whether a changed file can hold exported names worth looking up in the docs. */
export function isSourceFile(path: string): boolean {
  return (
    /^(?:(?:apps|packages|config)\/[^/]+\/)?(?:src|scripts)\/.*\.m?ts$/.test(path) &&
    !path.endsWith(".d.ts")
  );
}

/** A workspace package's manifest, by the folder that holds it ("" for the root). */
export interface FolderManifest {
  folder: string;
  manifest: unknown;
}

/**
 * Every package.json as one manifest: the root's scripts by name, a package's
 * as `<name>#<script>` (Turborepo's form), and every package's settings and
 * commands together.
 */
export function mergeManifests(manifests: readonly FolderManifest[]): unknown {
  const scripts: Record<string, unknown> = {};
  const configuration: unknown[] = [];
  const commands: unknown[] = [];
  for (const { folder, manifest } of manifests) {
    const name =
      isRecord(manifest) && typeof manifest["name"] === "string" ? manifest["name"] : folder;
    for (const [script, command] of Object.entries(scriptsOf(manifest))) {
      scripts[folder === "" ? script : `${name}#${script}`] = command;
    }
    const contributes = isRecord(manifest) ? manifest["contributes"] : undefined;
    if (isRecord(contributes)) {
      configuration.push(contributes["configuration"]);
      const listed: unknown[] = Array.isArray(contributes["commands"])
        ? contributes["commands"]
        : [];
      commands.push(...listed);
    }
  }
  return { scripts, contributes: { configuration: configuration.flat(), commands } };
}

/** `git` in the working directory; its stdout, or `undefined` when it fails. */
function git(args: readonly string[]): string | undefined {
  const [result, error] = tryCatchSync(() => spawnSync("git", args, { encoding: "utf8" }));
  return error === null && result.status === 0 ? result.stdout : undefined;
}

interface ShowArgs {
  ref: string;
  path: string;
}

/** A file's text at `ref`, or `undefined` when it isn't there. */
function show({ ref, path }: ShowArgs): string | undefined {
  return git(["show", `${ref}:${path}`]);
}

/** Every tracked package.json at `ref`, merged; one that isn't JSON counts as empty. */
function manifestAt(ref: string): unknown {
  const listing = git(["ls-tree", "-r", "--name-only", ref]) ?? "";
  const paths = listing.split("\n").filter((path) => /(?:^|\/)package\.json$/.test(path));
  return mergeManifests(
    paths.map((path) => {
      const [manifest] = tryCatchSync((): unknown => JSON.parse(show({ ref, path }) ?? ""));
      const folder = posix.dirname(path);
      return { folder: folder === "." ? "" : folder, manifest };
    }),
  );
}

/** Every ADR's Status line at `ref`, by number. */
function adrStatusesAt(ref: string): Map<string, string> {
  const statuses = new Map<string, string>();
  const listing = git(["ls-tree", "--name-only", ref, "docs/adr/"]) ?? "";
  for (const path of listing.split("\n")) {
    const number = /^docs\/adr\/(\d{4})-.*\.md$/.exec(path)?.[1];
    const status = number && adrStatus(show({ ref, path }) ?? "");
    if (number && status) {
      statuses.set(number, status);
    }
  }
  return statuses;
}

interface SourceTextsAtArgs {
  ref: string;
  paths: readonly string[];
}

/** The text at `ref` of each of `paths` that is a source file and exists there. */
function sourceTextsAt({ ref, paths }: SourceTextsAtArgs): string[] {
  return paths.filter(isSourceFile).flatMap((path) => show({ ref, path }) ?? []);
}

interface DocsSyncArgs {
  since: string;
}

/** The report for `since..HEAD`, or a full sweep when that range can't be diffed. */
function docsSync({ since }: DocsSyncArgs): DocsSyncReport | FullSweep {
  const head = git(["rev-parse", "HEAD"])?.trim();
  if (head === undefined) {
    throw new Error("docs-sync needs a git checkout with a HEAD commit");
  }
  if (git(["rev-parse", "--verify", "--quiet", since]) === undefined) {
    return { since: null, head, full: true, reason: `no ${since} tag: sweep every doc` };
  }
  const nameStatus = git(["diff", "--name-status", "-M", since, "HEAD"]);
  if (nameStatus === undefined) {
    return {
      since: null,
      head,
      full: true,
      reason: `can't diff from ${since} (shallow clone?): sweep every doc`,
    };
  }
  const files = parseNameStatus(nameStatus);
  const manifests = { before: manifestAt(since), after: manifestAt("HEAD") };
  const oldPaths = [...files.removed, ...files.modified, ...files.renamed.map(({ from }) => from)];
  const newPaths = [...files.added, ...files.modified, ...files.renamed.map(({ to }) => to)];
  return {
    since,
    head,
    full: false,
    files,
    scripts: diffScripts(manifests),
    settings: diffSettings(manifests),
    commands: diffCommands(manifests),
    adrStatuses: adrStatusChanges({ before: adrStatusesAt(since), after: adrStatusesAt("HEAD") }),
    symbols: diffSymbols({
      before: sourceTextsAt({ ref: since, paths: oldPaths }),
      after: sourceTextsAt({ ref: "HEAD", paths: newPaths }),
    }),
  };
}

if (import.meta.main) {
  const args = process.argv.slice(FIRST_ARGUMENT);
  const flag = args.indexOf("--since");
  const since = flag === -1 ? DEFAULT_SINCE : args[flag + VALUE_OFFSET];
  if (since === undefined) {
    console.error("--since needs a ref");
    process.exit(1);
  }
  const [report, error] = tryCatchSync(() => docsSync({ since }));
  if (error !== null) {
    console.error(errorText(error));
    process.exit(1);
  }
  console.log(JSON.stringify(report, null, JSON_INDENT));
}
