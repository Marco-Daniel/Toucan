// `node scripts/fill-release-notes.mts <vsix> <out>`: writes release-notes.md
// with the VSIX's SHA-256 in place, as the draft release's notes. The
// packaging workflow runs it once the VSIX is built.
// import libraries
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";

// import utils
import { filledReleaseNotes } from "./release-notes.mts";

/** After `node` and this script come the arguments. */
const FIRST_ARGUMENT = 2;

const [vsix, out] = process.argv.slice(FIRST_ARGUMENT);
if (vsix === undefined || out === undefined) {
  throw new Error("Usage: node scripts/fill-release-notes.mts <vsix> <out>");
}
const sha256 = createHash("sha256").update(readFileSync(vsix)).digest("hex");
const notes = readFileSync(new URL("../release-notes.md", import.meta.url), "utf8");
writeFileSync(out, filledReleaseNotes({ notes, sha256 }));
console.log(`${out}: release notes with SHA-256 ${sha256}`);
