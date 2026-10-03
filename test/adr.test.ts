// import libraries
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..");
const ADR_DIR = join(ROOT, "docs", "adr");
/** The parts of a workspace package that instruct or run: an ADR cited there must be in force. */
const PACKAGE_LIVE = ["src", "scripts", "test", "README.md"];

/** Each workspace package's folder, from pnpm-workspace.yaml's `<group>/*` globs. */
function packageFolders(): string[] {
  const workspace = readFileSync(join(ROOT, "pnpm-workspace.yaml"), "utf8");
  const globs = /^packages:\n((?:[ \t]+- .*\n)+)/m.exec(workspace)?.[1] ?? "";
  return [...globs.matchAll(/- ([\w-]+)\/\*$/gm)].flatMap(([, group = ""]) =>
    readdirSync(join(ROOT, group), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => `${group}/${entry.name}`)
      .toSorted(),
  );
}

/** Live instructions: an ADR cited here must still be in force. */
const LIVE = [
  ...packageFolders().flatMap((folder) =>
    PACKAGE_LIVE.map((part) => `${folder}/${part}`).filter((path) => existsSync(join(ROOT, path))),
  ),
  "scripts",
  "test",
  ".claude/CLAUDE.md",
  "README.md",
  "docs/adr/README.md",
];
/** History: the ADRs and plans may cite an ADR that was later superseded (that's how superseding reads). */
const HISTORY = ["docs/adr", "docs/plans"];
const CITATION = /\bADR-(\d{4})\b/g;

interface AdrHeader {
  number: string;
  /** The number in the `# NNNN.` heading, which must match the file name's. */
  headingNumber: string | undefined;
  file: string;
  title: string;
  kind: string | undefined;
  status: string | undefined;
}

/** Each ADR file's number, title and header fields. */
function adrs(): AdrHeader[] {
  return readdirSync(ADR_DIR)
    .filter((file) => /^\d{4}-.*\.md$/.test(file))
    .map((file) => {
      const text = readFileSync(join(ADR_DIR, file), "utf8");
      const field = (name: string) => new RegExp(`^- ${name}: (.+)$`, "m").exec(text)?.[1];
      return {
        number: file.slice(0, 4),
        headingNumber: /^# (\d{4})\. /m.exec(text)?.[1],
        file,
        title: /^# \d{4}\. (.+)$/m.exec(text)?.[1] ?? "",
        kind: field("Kind"),
        status: field("Status"),
      };
    });
}

interface IndexRow {
  number: string;
  file: string;
  title: string;
  kind: string;
  status: string;
}

/** The README index's rows: `| [NNNN](file.md) | title | Kind | Status |`. */
function indexRows(readme: string): IndexRow[] {
  return [...readme.matchAll(/^\| \[(\d{4})\]\(([^)]+)\) \| (.+?) \| (.+?) \| (.+?) \|$/gm)].map(
    ([, number = "", file = "", title = "", kind = "", status = ""]) => ({
      number,
      file,
      title,
      kind,
      status,
    }),
  );
}

/** Every file under `path` (or the file itself), as repo-relative paths. */
function filesUnder(path: string): string[] {
  const full = join(ROOT, path);
  try {
    return readdirSync(full, { recursive: true, encoding: "utf8" })
      .filter((file) => /\.(ts|mts|md)$/.test(file))
      .map((file) => join(path, file));
  } catch {
    return [path];
  }
}

/** Each `ADR-NNNN` cited at `sites`, with where; an ADR naming its own number doesn't count. */
function citations(sites: readonly string[]): { number: string; where: string }[] {
  return sites.flatMap(filesUnder).flatMap((file) => {
    const own = /docs\/adr\/(\d{4})-/.exec(file)?.[1];
    return [...readFileSync(join(ROOT, file), "utf8").matchAll(CITATION)]
      .map(([, number = ""]) => ({ number, where: file }))
      .filter(({ number }) => number !== own);
  });
}

describe("the ADR log", () => {
  const log = adrs();
  const readme = readFileSync(join(ADR_DIR, "README.md"), "utf8");

  it("numbers its ADRs from one, without gaps or repeats", () => {
    const numbers = log.map(({ number }) => number).toSorted();
    expect(numbers).toEqual(numbers.map((_, i) => String(i + 1).padStart(4, "0")));
  });

  it("heads each ADR with its file's number", () => {
    const mismatched = log.filter(({ number, headingNumber }) => headingNumber !== number);
    expect(mismatched).toEqual([]);
  });

  it("gives every ADR a title, a kind and a status", () => {
    const incomplete = log.filter(
      ({ title, kind, status }) =>
        title === "" || !["constraint", "background", "direction"].includes(kind ?? "") || !status,
    );
    expect(incomplete).toEqual([]);
  });

  it("lists every ADR in the README index, once, as its file says", () => {
    const rows = indexRows(readme);
    expect(rows.map(({ number }) => number).toSorted()).toEqual(
      log.map(({ number }) => number).toSorted(),
    );
    for (const { number, file, title, kind, status } of log) {
      expect(rows.find((row) => row.number === number)).toEqual({
        number,
        file,
        title,
        kind,
        status,
      });
    }
  });

  it("only cites ADRs that exist", () => {
    const numbers = new Set(log.map(({ number }) => number));
    const missing = citations([...LIVE, ...HISTORY]).filter(({ number }) => !numbers.has(number));
    expect(missing).toEqual([]);
  });

  it("reads the live instructions of every workspace package and of the root", () => {
    expect(LIVE).toEqual([
      "apps/extension/src",
      "apps/extension/scripts",
      "apps/extension/test",
      "apps/extension/README.md",
      "config/vite/src",
      "config/vite/test",
      "scripts",
      "test",
      ".claude/CLAUDE.md",
      "README.md",
      "docs/adr/README.md",
    ]);
  });

  it("points live instructions only at accepted ADRs", () => {
    const statusOf = new Map(log.map((adr) => [adr.number, adr.status]));
    const found = citations(LIVE);
    // It did read the citations: CLAUDE.md cites the ADRs its rules come from.
    expect(found.some(({ where }) => where === join(".claude", "CLAUDE.md"))).toBe(true);
    // Superseded, Deprecated or Rejected: the rule no longer stands.
    expect(found.filter(({ number }) => statusOf.get(number) !== "Accepted")).toEqual([]);
  });
});
