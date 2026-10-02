// import libraries
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SRC = join(import.meta.dirname, "../src");
/** Any `export … from`: `{ … }`, `*` and `* as x`, each with or without `type`. */
const RE_EXPORT = /^export (type )?(\{|\*)[^;]* from /m;

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

  it.each([
    'export { a } from "./a.ts";',
    'export type { A } from "./a.ts";',
    'export * from "./a.ts";',
    'export type * from "./a.ts";',
    'export * as a from "./a.ts";',
    'export {\n  a,\n  b,\n} from "./a.ts";',
  ])("counts %j as a re-export", (source) => {
    expect(RE_EXPORT.test(source)).toBe(true);
  });

  it.each(["export { a };", "export type { A };", "export const a = 1;"])(
    "doesn't count the local export %j",
    (source) => {
      expect(RE_EXPORT.test(source)).toBe(false);
    },
  );
});
