// Whether a `pnpm mutate` run may start on the given files, and what it never
// mutates. The command itself is scripts/mutate-cli.mts, which no test
// imports and which is never mutated: a mutant there (`import.meta.main` made
// true, say) would start a nested Stryker run inside a test.
// import libraries
import { isAbsolute, relative, resolve, sep } from "node:path";

/** Never mutated: it locks files, writes qmd's cache and starts detached processes (ADR-0012). */
export const EXCLUDED = "scripts/qmd/";
/** The mutate command itself, never mutated (see the header). */
export const ENTRY = "scripts/mutate-cli.mts";
/** Added to every explicit file list, which replaces the config's list and its exclusions. */
export const EXCLUSIONS = [`!${EXCLUDED}**`, `!${ENTRY}`];

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
  const entry = paths.filter(({ path }) => path.toLowerCase() === ENTRY);
  if (entry.length > 0) {
    return `Not mutating ${entry.map(({ file }) => file).join(", ")}: the mutate command itself is never mutated, because a mutant there could start Stryker inside a test.`;
  }
  // The related-tests command needs file paths: a glob reaches it verbatim, finds
  // no tests, and every mutant would read as survived. The shell expands an unquoted one.
  const globs = files.filter((file) => /[*?[{]/.test(file));
  if (globs.length > 0) {
    return `Pass files, not patterns: ${globs.join(", ")}. Leave a glob unquoted to let the shell expand it.`;
  }
  return undefined;
}
