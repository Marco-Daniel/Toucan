// import libraries
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// import utils
import { writeAtomically } from "../../../src/shared/fs/atomicWrite.util.ts";

// import types
import type * as FsPromises from "node:fs/promises";

/** The temp file's permission bits each time chmod is about to change them. */
const modesBeforeChmod = vi.hoisted((): number[] => []);

// The real chmod, recording the mode the file was created with just before it.
vi.mock("node:fs/promises", async (importOriginal) => {
  const real = await importOriginal<typeof FsPromises>();
  return {
    ...real,
    chmod: async (path: string, mode: number) => {
      modesBeforeChmod.push((await real.stat(path)).mode & 0o777);
      await real.chmod(path, mode);
    },
  };
});

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "toucan-atomic-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("writeAtomically", () => {
  it("replaces the file and leaves no temp file", async () => {
    const file = join(dir, "settings.json");
    writeFileSync(file, "old");
    await writeAtomically({ file, temporary: join(dir, "settings.tmp"), text: "new" });
    expect(readFileSync(file, "utf8")).toBe("new");
    expect(readdirSync(dir)).toEqual(["settings.json"]);
  });

  it("gives the file exactly the mode asked for, past the umask", async () => {
    const file = join(dir, "settings.json");
    await writeAtomically({ file, temporary: join(dir, "settings.tmp"), text: "x", mode: 0o666 });
    // Tests run with a umask (typically 022) that would narrow 0o666 without the chmod.
    expect(statSync(file).mode & 0o777).toBe(0o666);
  });

  it("creates the temp file with the mode already, never more readable first", async () => {
    modesBeforeChmod.length = 0;
    const file = join(dir, "settings.json");
    await writeAtomically({ file, temporary: join(dir, "settings.tmp"), text: "x", mode: 0o600 });
    expect(modesBeforeChmod).toEqual([0o600]);
  });

  it("removes the temp file and rethrows when the rename fails", async () => {
    // The target's folder doesn't exist, so the rename fails after the temp file is written.
    const file = join(dir, "missing", "settings.json");
    await expect(
      writeAtomically({ file, temporary: join(dir, "settings.tmp"), text: "x" }),
    ).rejects.toThrow(/ENOENT/);
    expect(readdirSync(dir)).toEqual([]);
  });
});
