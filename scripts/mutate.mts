// `pnpm mutate [file…]`: mutation testing with StrykerJS, on demand only (not
// in CI or the pre-push hook). With no files it mutates all of src/ and
// scripts/; with files it mutates just those and runs only the tests related
// to them, which is what a change needs. Reports land in reports/stryker/.
//
// Why the command runner rather than @stryker-mutator/vitest-runner: under
// Vitest 5 that runner never switched mutants on inside functions, so nearly
// everything "survived". The command runner passes the active mutant in an
// environment variable.
//
// scripts/qmd/ is never mutated: it locks files, writes qmd's cache and
// starts detached processes, so a mutant there can reach the real
// ~/.cache/qmd or leave processes running. Its tests still run as usual.
//
// stryker.config.json points tsconfigFile at a file that doesn't exist on
// purpose: Stryker's tsconfig rewrite needs the TypeScript JS API, which
// TypeScript 7 doesn't ship, and this repo's tsconfig has nothing to rewrite.
import { relative, resolve } from "node:path";
import { Stryker } from "@stryker-mutator/core";

const VITEST = "node node_modules/vitest/vitest.mjs";

/** A path as one shell word: Stryker runs the command through a shell, so spaces must not split it. */
function shellQuoted(path: string): string {
  return `'${path.replaceAll("'", `'\\''`)}'`;
}
// After `node` and this script come the files to mutate.
const FIRST_ARGUMENT = 2;
const files = process.argv.slice(FIRST_ARGUMENT);

/** Never mutated (see the header); also added to every explicit file list, which replaces the config's. */
const EXCLUDED = "scripts/qmd/";
// Compared as repo-relative paths, so "./scripts/qmd/…" and absolute paths are caught too.
const qmdFiles = files.filter((file) =>
  relative(process.cwd(), resolve(file)).startsWith(EXCLUDED),
);
if (qmdFiles.length > 0) {
  console.error(
    `Not mutating ${qmdFiles.join(", ")}: scripts/qmd/ is excluded from mutation testing, because its file locks, cache writes and detached processes could reach the real ~/.cache/qmd.`,
  );
  process.exit(1);
}

const options =
  files.length === 0
    ? {}
    : {
        // Explicit files replace the config's list, exclusion included: a glob
        // such as scripts/**/*.mts must still leave scripts/qmd out.
        mutate: [...files, `!${EXCLUDED}**`],
        commandRunner: { command: `${VITEST} related --run ${files.map(shellQuoted).join(" ")}` },
      };
await new Stryker({ configFile: "stryker.config.json", ...options }).runMutationTest();
