// Fails when the VSIX would ship anything other than the expected files, so a
// .vscodeignore or manifest change can't slip extra (or missing) files into a
// release unnoticed.
import { execFileSync } from "node:child_process";

const EXPECTED = [
  "LICENSE",
  "README.md",
  "dist/extension.cjs",
  "dist/extension.cjs.map",
  "media/toucan-icons.woff",
  "package.json",
];

const listed = execFileSync("vsce", ["ls", "--no-dependencies"], { encoding: "utf8" })
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line !== "")
  .toSorted();

const missing = EXPECTED.filter((file) => !listed.includes(file));
const extra = listed.filter((file) => !EXPECTED.includes(file));
if (missing.length > 0 || extra.length > 0) {
  throw new Error(
    `VSIX contents differ. Missing: ${missing.join(", ") || "none"}. Extra: ${extra.join(", ") || "none"}.`,
  );
}
console.log(`VSIX contains exactly: ${listed.join(", ")}`);
