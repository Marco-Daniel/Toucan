// The mutate command; its checks live in scripts/mutate.mts, which tests
// import. Nothing imports this file, and it's never mutated.
//
// `pnpm mutate [file…]` at the root, `pnpm -C apps/extension mutate [file…]`
// for the extension: mutation testing with StrykerJS, on demand only (not in CI
// or the pre-push hook). It runs in the package it's started from, with that
// package's stryker.config.json, so the files must be inside that package.
// With no files it mutates what the config lists; with files it mutates just
// those and runs only the tests related to them, which is what a change needs.
// Reports land in the package's reports/stryker/. Every run is a full run
// (incremental: false): with the command runner, Stryker can't tell which
// tests cover a mutant, so a cached result could hide a weakened test.
//
// Why the command runner rather than @stryker-mutator/vitest-runner: under
// Vitest 5 that runner never switched mutants on inside functions, so nearly
// everything "survived". The command runner passes the active mutant in an
// environment variable. Each package's Vitest setup gives the run a fresh
// HOME and qmd cache, so a mutant never reaches the real ones.
//
// scripts/qmd/ is never mutated (ADR-0012): it locks files, writes qmd's cache
// and starts detached processes, so a mutant there can reach the real
// ~/.cache/qmd or leave processes running. Its tests still run as usual.
// Neither is this file.
//
// The stryker.config.json files point tsconfigFile at a file that doesn't
// exist on purpose: Stryker's tsconfig rewrite needs the TypeScript JS API,
// which TypeScript 7 doesn't ship, and there's nothing to rewrite.
// import utils
import { EXCLUSIONS, mutateRefusal } from "./mutate.mts";

const VITEST = "node node_modules/vitest/vitest.mjs";

/** Prints why the run won't start and exits with a failure. */
function refuse(message: string): never {
  console.error(message);
  process.exit(1);
}

/** The files no test file relates to (imports, directly or not), found without running tests. */
async function filesWithoutTests(paths: readonly string[]): Promise<string[]> {
  const { createVitest } = await import("vitest/node");
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

if (import.meta.main) {
  // After `node` and this script come the files to mutate.
  const FIRST_ARGUMENT = 2;
  const files = process.argv.slice(FIRST_ARGUMENT);
  const refusal = mutateRefusal({ files, cwd: process.cwd() });
  if (refusal !== undefined) {
    refuse(refusal);
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
          // Explicit files replace the config's list, exclusions included: a glob
          // such as scripts/**/*.mts must still leave scripts/qmd and this file out.
          mutate: [...files, ...EXCLUSIONS],
          commandRunner: {
            command: `${VITEST} related --run ${files.map(shellQuoted).join(" ")}`,
          },
        };
  const { Stryker } = await import("@stryker-mutator/core");
  await new Stryker({ configFile: "stryker.config.json", ...options }).runMutationTest();
}
