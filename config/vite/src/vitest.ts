// The Vitest settings every Toucan package's tests share; each package's
// vitest.config.ts merges its own on top.
// import libraries
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export const VITEST_BASE = defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
    // A folder per run for HOME, the qmd cache and TMPDIR, for every test worker;
    // the run fails if a test leaves a temp folder behind.
    globalSetup: [fileURLToPath(new URL("testRun.ts", import.meta.url))],
    // Explicit, so a test waiting on a child or an event fails rather than stalls.
    testTimeout: 15_000,
    hookTimeout: 15_000,
  },
});
