// `pnpm changelog`: writes CHANGELOG.md, which the VSIX ships and the
// Marketplace shows, from Toucan's published GitHub releases. With --release
// (the packaging workflow) it puts this version's notes from release-notes.md
// first, and fails unless they're this version's. It never falls back to a
// snapshot: a changelog that missed a release would ship in the VSIX for good.
// import libraries
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";

// import utils
import { changelogMarkdown } from "@toucan/releases/changelog.util.ts";
import { fetchGitHubReleases, parseReleases } from "@toucan/releases/releases.util.ts";
import { isRecord } from "../src/shared/records/records.util.ts";
import { releaseNotesProblems } from "./release-notes.mts";

// import types
import type { UpcomingRelease } from "@toucan/releases/changelog.util.ts";

const { values } = parseArgs({ options: { release: { type: "boolean", default: false } } });
const manifest: unknown = JSON.parse(
  readFileSync(new URL("../package.json", import.meta.url), "utf8"),
);
const version = isRecord(manifest) ? manifest["version"] : undefined;
if (typeof version !== "string") {
  throw new Error("package.json has no version");
}

let upcoming: UpcomingRelease | undefined;
if (values.release) {
  const notesFile = new URL("../release-notes.md", import.meta.url);
  if (!existsSync(notesFile)) {
    throw new Error(`release-notes.md is missing: the bump PR for ${version} writes it`);
  }
  const notes = readFileSync(notesFile, "utf8");
  const problems = releaseNotesProblems({ notes, version });
  if (problems.length > 0) {
    throw new Error(`release-notes.md isn't ready for ${version}: ${problems.join("; ")}`);
  }
  upcoming = { version, notes };
}
const releases = parseReleases(await fetchGitHubReleases());
writeFileSync(
  new URL("../CHANGELOG.md", import.meta.url),
  changelogMarkdown({ releases, upcoming }),
);
console.log(
  `CHANGELOG.md: ${upcoming === undefined ? "" : `${version}, then `}${releases.length} releases`,
);
