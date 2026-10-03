// import libraries
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
    // A fresh HOME and qmd cache per run, for every test worker.
    globalSetup: ["test/testHome.ts"],
    // Explicit, so a test waiting on a child or an event fails rather than stalls.
    testTimeout: 15_000,
    hookTimeout: 15_000,
  },
});
