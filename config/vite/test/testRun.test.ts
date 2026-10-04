// import libraries
import { homedir, tmpdir } from "node:os";
import { basename, dirname } from "node:path";
import { describe, expect, it } from "vitest";

// import utils
import { leftoversError, RUN_PREFIX } from "../src/testRun.ts";

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
