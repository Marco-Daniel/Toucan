// import libraries
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

// import utils
import { leftoversError, RUN_PREFIX, startRun } from "../src/testRun.ts";

describe("the test run's folder", () => {
  // Set up by src/testRun.ts, so nothing a test leaves running can reach the real home or temp folder.
  it("holds the run's home and temp folder, side by side, and qmd's cache points at the home", () => {
    expect([basename(homedir()), basename(tmpdir())]).toEqual(["home", "tmp"]);
    expect(dirname(homedir())).toBe(dirname(tmpdir()));
    expect(basename(dirname(homedir())).startsWith(RUN_PREFIX)).toBe(true);
    expect(process.env["XDG_CACHE_HOME"]).toBe(homedir());
  });
});

describe("leftoversError", () => {
  it("is undefined when the run left nothing", () => {
    expect(leftoversError([])).toBeUndefined();
  });

  it("names every entry a run left, sorted, and counts them", () => {
    expect(leftoversError(["toucan-hook-b", "toucan-font-a"])?.message).toBe(
      "Tests left 2 temp entries behind; each test must remove what it makes: toucan-font-a, toucan-hook-b",
    );
    expect(leftoversError(["x"])?.message).toBe(
      "Tests left 1 temp entry behind; each test must remove what it makes: x",
    );
  });
});

/** This run's temp folder, captured once: nothing here may remove it. */
const OUTER_TEMP = tmpdir();

interface RemoveNestedTempArgs {
  /** The temp folder to remove: a nested run's tmp/. */
  temp: string;
  /** The temp folder the nested run was started in. */
  outerTemp: string;
}

/**
 * Removes a nested run's tmp/, and nothing else: it must be named tmp, sit in
 * a run folder directly inside the outer temp folder (so never the outer
 * temp folder itself). Throws, removing nothing, otherwise; without the global setup the
 * outer temp folder is the real one, and this keeps it whole.
 */
function removeNestedTemp({ temp, outerTemp }: RemoveNestedTempArgs): void {
  const run = dirname(temp);
  if (
    basename(temp) !== "tmp" ||
    !basename(run).startsWith(RUN_PREFIX) ||
    dirname(run) !== outerTemp
  ) {
    throw new Error(`Refusing to remove ${temp}: not a nested run's temp folder`);
  }
  rmSync(temp, { recursive: true });
}

describe("removeNestedTemp", () => {
  // Paths that don't exist: a guard that wrongly let one through would remove nothing.
  const outerTemp = "/never/toucan-test-run-outer/tmp";

  it.each([
    ["the OS temp folder", "/never"],
    ["the outer run's own temp folder", outerTemp],
    ["the outer run's folder", "/never/toucan-test-run-outer"],
    ["a folder that isn't named tmp", `${outerTemp}/toucan-test-run-a/home`],
    ["a tmp/ outside a run folder", `${outerTemp}/other-a/tmp`],
    ["a run's tmp/ somewhere else", "/never/elsewhere/toucan-test-run-a/tmp"],
  ])("refuses %s, removing nothing", (_what, temp) => {
    expect(() => removeNestedTemp({ temp, outerTemp })).toThrow(
      `Refusing to remove ${temp}: not a nested run's temp folder`,
    );
  });

  it("lets a nested run's tmp/ through to the removal (ENOENT: it doesn't exist)", () => {
    expect(() =>
      removeNestedTemp({ temp: `${outerTemp}/toucan-test-run-a/tmp`, outerTemp }),
    ).toThrow("ENOENT");
  });
});

describe("a run's teardown", () => {
  // Each test starts a run of its own inside this one, then puts back this run's environment.
  const saved = { ...process.env };
  afterEach(() => {
    for (const key of ["HOME", "XDG_CACHE_HOME", "TMPDIR"]) {
      process.env[key] = saved[key];
    }
  });

  it("passes and removes the run folder when the run left nothing", () => {
    const { teardown, run } = startRun();
    writeFileSync(join(run, "home", "cache"), "kept in home/, which isn't checked");
    teardown();
    expect(existsSync(run)).toBe(false);
  });

  it("fails naming a leftover, and still removes the run folder", () => {
    const { teardown, run, temp } = startRun();
    mkdirSync(join(temp, "toucan-left-x"));
    expect(teardown).toThrow(
      "Tests left 1 temp entry behind; each test must remove what it makes: toucan-left-x",
    );
    expect(existsSync(run)).toBe(false);
  });

  it("fails when a test removed tmp/, and still removes the run folder", () => {
    const { teardown, run, temp } = startRun();
    removeNestedTemp({ temp, outerTemp: OUTER_TEMP });
    expect(teardown).toThrow("tmp/ itself, which a test removed");
    expect(existsSync(run)).toBe(false);
  });

  it("fails when a test replaced tmp/ with a file, and still removes the run folder", () => {
    const { teardown, run, temp } = startRun();
    removeNestedTemp({ temp, outerTemp: OUTER_TEMP });
    writeFileSync(temp, "not a folder");
    expect(teardown).toThrow("ENOTDIR");
    expect(existsSync(run)).toBe(false);
  });
});
