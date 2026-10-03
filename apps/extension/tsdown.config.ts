// import libraries
import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/core/extension.ts"],
  format: "cjs",
  platform: "node",
  // Lowest Node a ^1.138 extension host may run (VS Code 1.139.1 ships Node 24.20).
  // Deliberately independent of .nvmrc, which pins the dev toolchain.
  target: "node22",
  outDir: "dist",
  fixedExtension: true,
  sourcemap: true,
  dts: false,
  deps: {
    // Provided by the VS Code extension host.
    neverBundle: ["vscode"],
    // The VSIX ships without node_modules, so runtime dependencies are bundled,
    // and so is @toucan/brand, a workspace package that ships as source.
    alwaysBundle: [/^culori(\/|$)/, /^jsonc-parser(\/|$)/, /^@toucan\/brand(\/|$)/],
    onlyBundle: [/^culori(\/|$)/, /^jsonc-parser(\/|$)/, /^@toucan\/brand(\/|$)/],
  },
});
