import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig } from "vitest/config";

// Every test worker's HOME and qmd cache: code that outlives a test's own
// stubs can't reach the real ~/.cache/qmd.
const TEST_HOME = join(tmpdir(), "toucan-test-home");

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
    env: { HOME: TEST_HOME, XDG_CACHE_HOME: TEST_HOME },
    // Explicit, so a test waiting on a child or an event fails rather than stalls.
    testTimeout: 15_000,
    hookTimeout: 15_000,
  },
});
