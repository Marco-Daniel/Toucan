// import libraries
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// import utils
import { EXCLUSIONS, mutateRefusal } from "../../scripts/mutate.mts";

const ROOT = "/repo";
const EXTENSION = "/repo/apps/extension";

describe("mutateRefusal", () => {
  it.each([
    ["scripts/docs-sync.mts"],
    ["./scripts/docs-sync.mts"],
    ["/repo/scripts/docs-sync.mts"],
    ["scripts/qmdx/notes.mts"],
  ])("lets the root mutate %s", (file) => {
    expect(mutateRefusal({ files: [file], cwd: ROOT })).toBeUndefined();
  });

  it.each([
    ["scripts/qmd/qmd-lock.mts"],
    ["./scripts/qmd/qmd-lock.mts"],
    ["/repo/scripts/qmd/qmd-lock.mts"],
    ["scripts/../scripts/qmd/qmd-run.mts"],
    ["Scripts/QMD/qmd-run.mts"],
  ])("refuses the qmd script %s, and says why", (file) => {
    expect(mutateRefusal({ files: ["scripts/docs-sync.mts", file], cwd: ROOT })).toBe(
      `Not mutating ${file}: scripts/qmd/ is excluded from mutation testing, because its file locks, cache writes and detached processes could reach the real ~/.cache/qmd.`,
    );
  });

  it.each([
    ["../../scripts/qmd/qmd-lock.mts"],
    ["../../scripts/docs-sync.mts"],
    ["/repo/scripts/docs-sync.mts"],
    [".."],
  ])("refuses %s from the extension, outside its package", (file) => {
    expect(mutateRefusal({ files: ["src/core/extension.ts", file], cwd: EXTENSION })).toBe(
      `Not mutating ${file}: outside this package. Run mutate in the package that holds them: \`pnpm mutate\` at the root, \`pnpm -C apps/extension mutate\` for the extension.`,
    );
  });

  it("lets the extension mutate its own files, its own scripts included", () => {
    expect(
      mutateRefusal({
        files: ["src/core/extension.ts", "scripts/check-vsix.mts", "..file.ts"],
        cwd: EXTENSION,
      }),
    ).toBeUndefined();
  });

  it("refuses a glob, which would reach the related-tests command verbatim", () => {
    expect(mutateRefusal({ files: ["src/**/*.ts", "src/a.ts"], cwd: EXTENSION })).toBe(
      "Pass files, not patterns: src/**/*.ts. Leave a glob unquoted to let the shell expand it.",
    );
  });

  it("names every refused file, separated by commas", () => {
    expect(mutateRefusal({ files: ["scripts/qmd/a.mts", "scripts/qmd/b.mts"], cwd: ROOT })).toMatch(
      /^Not mutating scripts\/qmd\/a\.mts, scripts\/qmd\/b\.mts: scripts\/qmd\/ is excluded/,
    );
    expect(mutateRefusal({ files: ["../a.ts", "../b.ts"], cwd: EXTENSION })).toMatch(
      /^Not mutating \.\.\/a\.ts, \.\.\/b\.ts: outside this package\./,
    );
    expect(mutateRefusal({ files: ["src/*.ts", "src/?.ts"], cwd: EXTENSION })).toBe(
      "Pass files, not patterns: src/*.ts, src/?.ts. Leave a glob unquoted to let the shell expand it.",
    );
  });

  it.each([
    ["scripts/mutate-cli.mts"],
    ["./scripts/mutate-cli.mts"],
    ["/repo/scripts/mutate-cli.mts"],
    ["Scripts/Mutate-CLI.mts"],
  ])("refuses the mutate command %s itself, and says why", (file) => {
    expect(mutateRefusal({ files: ["scripts/mutate.mts", file], cwd: ROOT })).toBe(
      `Not mutating ${file}: the mutate command itself is never mutated, because a mutant there could start Stryker inside a test.`,
    );
  });

  it("lets the root mutate the checks next to the command", () => {
    expect(
      mutateRefusal({ files: ["scripts/mutate.mts", "scripts/mutate-cli.mts.bak"], cwd: ROOT }),
    ).toBeUndefined();
  });

  it("lets a run without files start: the config's list, exclusion included, applies", () => {
    expect(mutateRefusal({ files: [], cwd: ROOT })).toBeUndefined();
  });
});

describe("what a mutate run leaves out", () => {
  it("adds the qmd scripts and the command to every explicit file list", () => {
    expect(EXCLUSIONS).toEqual(["!scripts/qmd/**", "!scripts/mutate-cli.mts"]);
  });

  it("leaves both out of the root config's own list", () => {
    const config = JSON.parse(
      readFileSync(new URL("../../stryker.config.json", import.meta.url), "utf8"),
    );
    expect(config.mutate).toEqual([
      "scripts/**/*.mts",
      "!scripts/qmd/**",
      "!scripts/mutate-cli.mts",
    ]);
  });
});

describe("every package's Stryker config", () => {
  it.each([
    ["stryker.config.json"],
    ["apps/extension/stryker.config.json"],
    ["packages/brand/stryker.config.json"],
    ["apps/site/stryker.config.json"],
  ])("%s runs in full every time, with no incremental cache (#16)", (path) => {
    const config = JSON.parse(readFileSync(new URL(`../../${path}`, import.meta.url), "utf8"));
    expect({ incremental: config.incremental, incrementalFile: config.incrementalFile }).toEqual({
      incremental: false,
      incrementalFile: undefined,
    });
  });
});
