// `pnpm mutate [file…]` at the root, `pnpm -C apps/extension mutate [file…]`
// for the extension: mutation testing with StrykerJS, on demand only (not in CI
// or the pre-push hook). It runs in the package it's started from, with that
// package's stryker.config.json, so the files must be inside that package.
// With no files it mutates what the config lists; with files it mutates just
// those and runs only the tests related to them, which is what a change needs.
// Reports land in the package's reports/stryker/; delete that folder after
// changing what's excluded, or the incremental file carries the old results
// into later reports.
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
//
// The stryker.config.json files point tsconfigFile at a file that doesn't
// exist on purpose: Stryker's tsconfig rewrite needs the TypeScript JS API,
// which TypeScript 7 doesn't ship, and there's nothing to rewrite.
// import libraries
import { isAbsolute, relative, resolve, sep } from "node:path";

const VITEST = "node node_modules/vitest/vitest.mjs";

/** Never mutated (see the header); also added to every explicit file list, which replaces the config's. */
export const EXCLUDED = "scripts/qmd/";

interface MutateRefusalArgs {
  files: readonly string[];
  /** The package the run starts in. */
  cwd: string;
}

/** Why a run on these files mustn't start, or undefined when it may. */
export function mutateRefusal({ files, cwd }: MutateRefusalArgs): string | undefined {
  // Package-relative, with forward slashes; lower case, because macOS paths
  // ignore case and "Scripts/qmd/" reaches the same files.
  const paths = files.map((file) => ({
    file,
    path: relative(cwd, resolve(cwd, file)).split(sep).join("/"),
  }));
  const outside = paths.filter(
    ({ path }) => path === ".." || path.startsWith("../") || isAbsolute(path),
  );
  if (outside.length > 0) {
    return `Not mutating ${outside.map(({ file }) => file).join(", ")}: outside this package. Run mutate in the package that holds them: \`pnpm mutate\` at the root, \`pnpm -C apps/extension mutate\` for the extension.`;
  }
  const qmd = paths.filter(({ path }) => path.toLowerCase().startsWith(EXCLUDED));
  if (qmd.length > 0) {
    return `Not mutating ${qmd.map(({ file }) => file).join(", ")}: scripts/qmd/ is excluded from mutation testing, because its file locks, cache writes and detached processes could reach the real ~/.cache/qmd.`;
  }
  // The related-tests command needs file paths: a glob reaches it verbatim, finds
  // no tests, and every mutant would read as survived. The shell expands an unquoted one.
  const globs = files.filter((file) => /[*?[{]/.test(file));
  if (globs.length > 0) {
    return `Pass files, not patterns: ${globs.join(", ")}. Leave a glob unquoted to let the shell expand it.`;
  }
  return undefined;
}

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
          // Explicit files replace the config's list, exclusion included: a glob
          // such as scripts/**/*.mts must still leave scripts/qmd out.
          mutate: [...files, `!${EXCLUDED}**`],
          commandRunner: {
            command: `${VITEST} related --run ${files.map(shellQuoted).join(" ")}`,
          },
        };
  const { Stryker } = await import("@stryker-mutator/core");
  await new Stryker({ configFile: "stryker.config.json", ...options }).runMutationTest();
}
