import { spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const HOOK = new URL("../../scripts/docs-reindex-hook.mts", import.meta.url).pathname;
const SYSTEM_PATH = "/usr/bin:/bin";

let dir: string;
let log: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "toucan-hook-"));
  log = join(dir, "qmd.log");
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

/** A stand-in for qmd that logs its arguments and lists `collections`. Never the real qmd. */
function fakeQmd(collections: string): string {
  const bin = join(dir, "bin");
  spawnSync("mkdir", ["-p", bin]);
  writeFileSync(
    join(bin, "qmd"),
    `#!/bin/sh\necho "$*" >> "${log}"\n[ "$1" = collection ] && printf '%s\\n' ${collections}\nexit 0\n`,
  );
  chmodSync(join(bin, "qmd"), 0o755);
  return `${bin}:${SYSTEM_PATH}`;
}

/** Runs the hook as Claude Code would after an edit of `file`. */
function edit(file: string, path: string) {
  return spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ tool_name: "Edit", tool_input: { file_path: file } }),
    env: { PATH: path, CLAUDE_PROJECT_DIR: "/repo" },
    encoding: "utf8",
  });
}

/** The fake qmd's log once the background job has run `until`, or after `ms` without it. */
async function logged(until: string, ms = 1000): Promise<string> {
  for (let waited = 0; waited < ms; waited += 25) {
    if (existsSync(log) && readFileSync(log, "utf8").includes(until)) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  return existsSync(log) ? readFileSync(log, "utf8") : "";
}

describe("the docs re-index hook", () => {
  it("re-indexes in the background after a docs edit", async () => {
    const result = edit(
      "/repo/docs/plans/glyph-set/plan.md",
      fakeQmd("'toucan-docs (qmd://toucan-docs/)'"),
    );
    expect(result).toMatchObject({ status: 0, stdout: "", stderr: "" });
    expect(await logged("update")).toBe("collection list\nupdate\n");
  });

  it("re-indexes after a guide edit", async () => {
    edit("/repo/README.md", fakeQmd("'toucan-guides (qmd://toucan-guides/)'"));
    expect(await logged("update")).toBe("collection list\nupdate\n");
  });

  it("does nothing for a source edit", async () => {
    edit("/repo/src/core/glyphs.ts", fakeQmd("'toucan-docs (qmd://toucan-docs/)'"));
    expect(await logged("update", 400)).toBe("");
  });

  it("skips the update when Toucan's collections aren't registered", async () => {
    edit("/repo/docs/plans/glyph-set/plan.md", fakeQmd("'notes (qmd://notes/)'"));
    expect(await logged("update", 400)).toBe("collection list\n");
  });

  it("stays silent without qmd", () => {
    expect(edit("/repo/docs/plans/glyph-set/plan.md", SYSTEM_PATH)).toMatchObject({
      status: 0,
      stdout: "",
      stderr: "",
    });
  });
});
