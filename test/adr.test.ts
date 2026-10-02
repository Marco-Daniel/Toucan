import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = join(import.meta.dirname, "..");
const ADR_DIR = join(ROOT, "docs", "adr");
/** Where code, the guides, the plans and the ADR log itself may cite an ADR. */
const CITING = [
  "src",
  "scripts",
  "test",
  ".claude/CLAUDE.md",
  "README.md",
  "docs/adr",
  "docs/plans",
];
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

/** Each `ADR-NNNN` cited, with where it's cited; an ADR naming its own number doesn't count. */
function citations(): { number: string; where: string }[] {
  return CITING.flatMap(filesUnder).flatMap((file) => {
    const own = /docs\/adr\/(\d{4})-/.exec(file)?.[1];
    return [...readFileSync(join(ROOT, file), "utf8").matchAll(CITATION)]
      .map(([, number = ""]) => ({ number, where: file }))
      .filter(({ number }) => number !== own);
  });
}

describe("the ADR log", () => {
  const log = adrs();
  const readme = readFileSync(join(ADR_DIR, "README.md"), "utf8");

  it("numbers its ADRs from 0001 without gaps or repeats", () => {
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

  it("only cites ADRs that exist and are accepted", () => {
    const byNumber = new Map(log.map((adr) => [adr.number, adr]));
    const found = citations();
    // It did read the citations: CLAUDE.md cites the ADRs its rules come from.
    expect(found.some(({ where }) => where === join(".claude", "CLAUDE.md"))).toBe(true);
    const broken = found.filter(({ number }) => {
      const adr = byNumber.get(number);
      // Superseded, Deprecated or Rejected: the rule no longer stands.
      return adr?.status !== "Accepted";
    });
    expect(broken).toEqual([]);
  });
});
