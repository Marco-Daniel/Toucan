// import libraries
import { mergeConfig } from "vitest/config";

// import consts
import { VITEST_BASE } from "@toucan/vite-config/vitest.ts";
import { SITE_ALIASES } from "./aliases.config.ts";

export default mergeConfig(VITEST_BASE, {
  resolve: { alias: SITE_ALIASES },
  test: { include: ["test/**/*.test.{ts,tsx}"] },
});
