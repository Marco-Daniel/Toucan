import { spawn, spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const HOOK = new URL("../../scripts/docs-reindex-hook.mts", import.meta.url).pathname;
const SYSTEM_PATH = "/usr/bin:/bin";
const REGISTERED = "'toucan-docs (qmd://toucan-docs/)'";

let dir: string;
let log: string;
let lock: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "toucan-hook-"));
  log = join(dir, "qmd.log");
  // The hook keeps its lock in the OS temp dir: this test's own.
  lock = join(dir, "toucan-qmd-update.lock");
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

/**
 * A stand-in for qmd (never the real one) that fails unless it's called on
 * Toucan's own index, lists `collections` and logs each update's start and end.
 */
function fakeQmd(collections: string, updateSeconds = 0): string {
  const bin = join(dir, "bin");
  mkdirSync(bin, { recursive: true });
  writeFileSync(
    join(bin, "qmd"),
    [
      "#!/bin/sh",
      `[ "$1 $2" = "--index toucan" ] || { echo "wrong index: $*" >> "${log}"; exit 2; }`,
      "shift 2",
      `case "$1" in`,
      `  collection) echo "collection $2" >> "${log}"; printf '%s\\n' ${collections} ;;`,
      `  update) echo "update start" >> "${log}"; sleep ${updateSeconds}; echo "update end" >> "${log}" ;;`,
      `  *) echo "$*" >> "${log}" ;;`,
      "esac",
      "",
    ].join("\n"),
  );
  chmodSync(join(bin, "qmd"), 0o755);
  return `${bin}:${SYSTEM_PATH}`;
}

const env = (path: string) => ({ PATH: path, CLAUDE_PROJECT_DIR: "/repo", TMPDIR: dir, HOME: dir });
const input = (file: unknown) =>
  JSON.stringify({ tool_name: "Edit", tool_input: { file_path: file } });

/** Runs the hook as Claude Code would, with `stdin` as its input. */
function hook(stdin: string, path: string) {
  return spawnSync(process.execPath, [HOOK], { input: stdin, env: env(path), encoding: "utf8" });
}

/** The same, without waiting, for several at once. */
function hookAsync(stdin: string, path: string): Promise<number | null> {
  const child = spawn(process.execPath, [HOOK], {
    env: env(path),
    stdio: ["pipe", "ignore", "ignore"],
  });
  child.stdin.end(stdin);
  return new Promise((resolve) => child.on("close", resolve));
}

const read = () => (existsSync(log) ? readFileSync(log, "utf8") : "");

/** The log once the background job is done: it releases the lock last. */
async function settled(): Promise<string> {
  await vi.waitFor(
    () => {
      if (existsSync(lock)) {
        throw new Error("still running");
      }
    },
    { timeout: 3000, interval: 25 },
  );
  return read();
}

/** The log after a moment, for cases where nothing should run. */
async function afterAMoment(): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return read();
}

describe("the docs re-index hook", () => {
  it("re-indexes Toucan's own index in the background after a docs edit", async () => {
    const result = hook(input("/repo/docs/plans/glyph-set/plan.md"), fakeQmd(REGISTERED));
    expect(result).toMatchObject({ status: 0, stdout: "", stderr: "" });
    expect(await settled()).toBe("collection list\nupdate start\nupdate end\n");
  });

  it("re-indexes after a guide edit", async () => {
    hook(input("/repo/README.md"), fakeQmd("'toucan-guides (qmd://toucan-guides/)'"));
    expect(await settled()).toBe("collection list\nupdate start\nupdate end\n");
  });

  it("does nothing for a source edit", async () => {
    hook(input("/repo/src/core/glyphs.ts"), fakeQmd(REGISTERED));
    expect(await afterAMoment()).toBe("");
    expect(existsSync(lock)).toBe(false);
  });

  it("skips the update when Toucan's collections aren't registered", async () => {
    hook(input("/repo/docs/plans/glyph-set/plan.md"), fakeQmd("'notes (qmd://notes/)'"));
    expect(await settled()).toBe("collection list\n");
  });

  it("runs one update at a time and catches up on edits made meanwhile", async () => {
    const path = fakeQmd(REGISTERED, 0.6);
    await hookAsync(input("/repo/docs/a.md"), path);
    // Edits while that update runs:
    await vi.waitFor(
      () => {
        if (!read().includes("update start")) {
          throw new Error("not started");
        }
      },
      { timeout: 3000, interval: 10 },
    );
    const codes = await Promise.all(
      ["b", "c", "d", "e", "f"].map((name) => hookAsync(input(`/repo/docs/${name}.md`), path)),
    );
    expect(codes).toEqual([0, 0, 0, 0, 0]);
    // Never two updates at once; the five edits during the first are coalesced into one more.
    expect(await settled()).toBe(
      "collection list\nupdate start\nupdate end\nupdate start\nupdate end\n",
    );
    expect(existsSync(`${lock}.pending`)).toBe(false);
  });

  it("only marks the edit pending while another update holds the lock", async () => {
    writeFileSync(lock, "");
    hook(input("/repo/docs/a.md"), fakeQmd(REGISTERED));
    expect(await afterAMoment()).toBe("");
    expect(existsSync(`${lock}.pending`)).toBe(true);
  });

  it("takes over a lock left by an update that died", async () => {
    writeFileSync(lock, "");
    const tenMinutesAgo = new Date(Date.now() - 10 * 60_000);
    utimesSync(lock, tenMinutesAgo, tenMinutesAgo);
    hook(input("/repo/docs/a.md"), fakeQmd(REGISTERED));
    expect(await settled()).toBe("collection list\nupdate start\nupdate end\n");
  });

  it.each([
    ["without qmd", SYSTEM_PATH],
    ["without sh", ""],
  ])("stays silent and lets go of the lock %s", async (_case, path) => {
    expect(hook(input("/repo/docs/a.md"), path)).toMatchObject({
      status: 0,
      stdout: "",
      stderr: "",
    });
    await settled();
    expect(existsSync(lock)).toBe(false);
  });

  it.each([
    ["a non-string file path", input(42)],
    ["empty input", ""],
    ["input that isn't JSON", "not json"],
  ])("ignores %s", async (_case, stdin) => {
    expect(hook(stdin, fakeQmd(REGISTERED))).toMatchObject({ status: 0, stdout: "", stderr: "" });
    expect(await afterAMoment()).toBe("");
    expect(existsSync(lock)).toBe(false);
  });
});
