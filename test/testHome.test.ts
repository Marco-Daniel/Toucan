import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("the test run's home", () => {
  // Set up by test/testHome.ts, so nothing a test leaves running can reach the real home.
  it("is a fresh temp dir, and qmd's cache points at it too", () => {
    expect(homedir().startsWith(join(tmpdir(), "toucan-test-home-"))).toBe(true);
    expect(process.env["XDG_CACHE_HOME"]).toBe(homedir());
  });
});
