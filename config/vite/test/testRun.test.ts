// import libraries
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

// import utils
import setup, { leftoversError, RUN_PREFIX } from "../src/testRun.ts";

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

/** Starts a run nested in this one; returns its teardown and its run folder. */
function nestedRun() {
  const teardown = setup();
  return { teardown, run: dirname(tmpdir()) };
}

describe("a run's teardown", () => {
  // Each test starts a run of its own inside this one, then puts back this run's environment.
  const saved = { ...process.env };
  afterEach(() => {
    for (const key of ["HOME", "XDG_CACHE_HOME", "TMPDIR"]) {
      process.env[key] = saved[key];
    }
  });

  it("passes and removes the run folder when the run left nothing", () => {
    const { teardown, run } = nestedRun();
    writeFileSync(join(homedir(), "cache"), "kept in home/, which isn't checked");
    teardown();
    expect(existsSync(run)).toBe(false);
  });

  it("fails naming a leftover, and still removes the run folder", () => {
    const { teardown, run } = nestedRun();
    mkdirSync(join(tmpdir(), "toucan-left-x"));
    expect(teardown).toThrow(
      "Tests left 1 temp entry behind; each test must remove what it makes: toucan-left-x",
    );
    expect(existsSync(run)).toBe(false);
  });

  it("fails when a test removed tmp/, and still removes the run folder", () => {
    const { teardown, run } = nestedRun();
    rmSync(tmpdir(), { recursive: true });
    expect(teardown).toThrow("tmp/ itself, which a test removed");
    expect(existsSync(run)).toBe(false);
  });

  it("fails when a test replaced tmp/ with a file, and still removes the run folder", () => {
    const { teardown, run } = nestedRun();
    const temp = tmpdir();
    rmSync(temp, { recursive: true });
    writeFileSync(temp, "not a folder");
    expect(teardown).toThrow("ENOTDIR");
    expect(existsSync(run)).toBe(false);
  });
});
