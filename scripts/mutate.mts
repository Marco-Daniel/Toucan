// `pnpm mutate [file…]`: mutation testing with StrykerJS, on demand only (not
// in CI or the pre-push hook). With no files it mutates all of src/ and
// scripts/; with files it mutates just those and runs only the tests related
// to them, which is what a change needs. Reports land in reports/stryker/;
// delete reports/stryker after changing what's excluded, or the incremental
// file carries the old results into later reports.
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
import { createVitest } from "vitest/node";

const VITEST = "node node_modules/vitest/vitest.mjs";

/** Prints why the run won't start and exits with a failure. */
function refuse(message: string): never {
  console.error(message);
  process.exit(1);
}

/** The files no test file relates to (imports, directly or not), found without running tests. */
async function filesWithoutTests(paths: readonly string[]): Promise<string[]> {
  const untested: string[] = [];
  for (const path of paths) {
    const vitest = await createVitest({ watch: false, related: [path] });
    const specifications = await vitest.getRelevantTestSpecifications();
    await vitest.close();
    if (specifications.length === 0) {
      untested.push(path);
    }
  }
  return untested;
}

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
  refuse(
    `Not mutating ${qmdFiles.join(", ")}: scripts/qmd/ is excluded from mutation testing, because its file locks, cache writes and detached processes could reach the real ~/.cache/qmd.`,
  );
}

// The related-tests command needs file paths: a glob reaches it verbatim, finds
// no tests, and every mutant would read as survived. The shell expands an unquoted one.
const globs = files.filter((file) => /[*?[{]/.test(file));
if (globs.length > 0) {
  refuse(
    `Pass files, not patterns: ${globs.join(", ")}. Leave a glob unquoted to let the shell expand it.`,
  );
}

// A file no test imports would also read as all survived: check before any mutant runs.
const untested = await filesWithoutTests(files);
if (untested.length > 0) {
  refuse(
    `No tests relate to ${untested.join(", ")}; mutation results would all read as survived. Add a test, or leave the file out.`,
  );
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
