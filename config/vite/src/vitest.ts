// The Vitest settings every Toucan package's tests share; each package's
// vitest.config.ts merges its own on top.
// import libraries
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export const VITEST_BASE = defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
    // A fresh HOME and qmd cache per run, for every test worker.
    globalSetup: [fileURLToPath(new URL("testHome.ts", import.meta.url))],
    // Explicit, so a test waiting on a child or an event fails rather than stalls.
    testTimeout: 15_000,
    hookTimeout: 15_000,
  },
});
