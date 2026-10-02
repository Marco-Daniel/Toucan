import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(import.meta.dirname, "../src");
/** `export { … } from`, `export * from` and `export type { … } from`: a re-export. */
const RE_EXPORT = /^export (\{|\*|type \{)[^;]* from /m;

describe("the source layout", () => {
  // Imports name the file that defines a symbol, so re-exports (barrels and
  // pass-throughs alike) only add a second way to reach it.
  it("has no re-exports", () => {
    const files = readdirSync(SRC, { recursive: true, encoding: "utf8" }).filter((file) =>
      file.endsWith(".ts"),
    );
    expect(files).toContain(join("core", "extension.ts"));
    const reExports = files.filter((file) => RE_EXPORT.test(readFileSync(join(SRC, file), "utf8")));
    expect(reExports).toEqual([]);
  });
});
