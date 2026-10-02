import { spawn, spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SYSTEM_PATH, fakeQmd } from "./fake-qmd.ts";

const HOOK = new URL("../../scripts/docs-reindex-hook.mts", import.meta.url).pathname;
const REGISTERED = "'toucan-docs (qmd://toucan-docs/)'";

let dir: string;
let folder: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "toucan-hook-"));
  folder = join(dir, `toucan-qmd-${process.getuid!()}`);
});
afterEach(() => {
  rmSync(join(dir, "hold"), { force: true });
  rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 });
});

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

const read = () =>
  existsSync(join(dir, "qmd.log")) ? readFileSync(join(dir, "qmd.log"), "utf8") : "";
const settled = () => !existsSync(join(folder, "lock")) && !existsSync(join(folder, "pending"));

/** Waits for `condition`, polling. */
async function until(condition: () => boolean): Promise<void> {
  await vi.waitFor(
    () => {
      if (!condition()) {
        throw new Error("not yet");
      }
    },
    { timeout: 5000, interval: 20 },
  );
}

/** Waits until the log hasn't changed for `quietMs`: the workers have all finished. */
async function quiet(quietMs = 200): Promise<void> {
  let last = read();
  let since = Date.now();
  await vi.waitFor(
    () => {
      const now = read();
      if (now !== last) {
        last = now;
        since = Date.now();
      }
      if (Date.now() - since < quietMs) {
        throw new Error("still writing");
      }
    },
    { timeout: 5000, interval: 20 },
  );
}

/** The log once the worker is done: the edit taken and the lock released. */
async function done(): Promise<string> {
  await until(() => read() !== "" && settled());
  return read();
}

describe("the docs re-index hook", () => {
  it("re-indexes Toucan's own index in the background after a docs edit", async () => {
    const result = hook(
      input("/repo/docs/plans/glyph-set/plan.md"),
      fakeQmd(dir, { collections: REGISTERED }),
    );
    expect(result).toMatchObject({ status: 0, stdout: "", stderr: "" });
    await until(() => read().includes("update end"));
    expect(await done()).toBe("version\ncollection list\nupdate start\nupdate end\n");
  });

  it("re-indexes after a guide edit", async () => {
    hook(
      input("/repo/README.md"),
      fakeQmd(dir, { collections: "'toucan-guides (qmd://toucan-guides/)'" }),
    );
    await until(() => read().includes("update end"));
    expect(await done()).toBe("version\ncollection list\nupdate start\nupdate end\n");
  });

  it("does nothing for a source edit", () => {
    expect(hook(input("/repo/src/core/glyphs.ts"), fakeQmd(dir))).toMatchObject({
      status: 0,
      stdout: "",
    });
    // Nothing was noted, so no worker started.
    expect(existsSync(folder)).toBe(false);
  });

  it("skips the update when Toucan's collections aren't registered", async () => {
    hook(
      input("/repo/docs/a.md"),
      fakeQmd(dir, { collections: "'not-toucan-docs (qmd://not-toucan-docs/)'" }),
    );
    expect(await done()).toBe("version\ncollection list\n");
  });

  it("runs one update at a time and catches up on edits made meanwhile", async () => {
    const path = fakeQmd(dir, { collections: REGISTERED });
    writeFileSync(join(dir, "hold"), "");
    hook(input("/repo/docs/a.md"), path);
    await until(() => read().includes("update start"));
    expect(
      await Promise.all(
        ["b", "c", "d", "e", "f"].map((name) => hookAsync(input(`/repo/docs/${name}.md`), path)),
      ),
    ).toEqual([0, 0, 0, 0, 0]);
    rmSync(join(dir, "hold"));
    await until(() => read().split("update end").length === 3 && settled());
    // Never two updates at once; the five edits during the first are coalesced into one more.
    const updates = read()
      .split("\n")
      .filter((line) => line.startsWith("update"));
    expect(updates).toEqual(["update start", "update end", "update start", "update end"]);
    // The workers that found the lock taken may still be finishing: let them, before cleanup.
    await quiet();
  });

  it("leaves the edit noted while another job holds the lock", async () => {
    mkdirSync(folder, { mode: 0o700 });
    writeFileSync(join(folder, "lock"), "another job");
    hook(input("/repo/docs/a.md"), fakeQmd(dir, { collections: REGISTERED }));
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(read()).toBe("");
    expect(existsSync(join(folder, "pending"))).toBe(true);
  });

  it("takes over a lock left by a job that died", async () => {
    mkdirSync(folder, { mode: 0o700 });
    writeFileSync(join(folder, "lock"), "a job that died");
    const tenMinutesAgo = new Date(Date.now() - 10 * 60_000);
    utimesSync(join(folder, "lock"), tenMinutesAgo, tenMinutesAgo);
    hook(input("/repo/docs/a.md"), fakeQmd(dir, { collections: REGISTERED }));
    await until(() => read().includes("update end"));
    expect(await done()).toBe("version\ncollection list\nupdate start\nupdate end\n");
  });

  it("doesn't follow a symlink planted at its pending note", async () => {
    mkdirSync(folder, { mode: 0o700 });
    const victim = join(dir, "victim");
    writeFileSync(victim, "keep me");
    symlinkSync(victim, join(folder, "pending"));
    expect(hook(input("/repo/docs/a.md"), fakeQmd(dir, { collections: REGISTERED }))).toMatchObject(
      {
        status: 0,
        stderr: "",
      },
    );
    await until(() => read().includes("update end") && settled());
    expect(readFileSync(victim, "utf8")).toBe("keep me");
  });

  it("does nothing when its folder is a symlink", async () => {
    const elsewhere = join(dir, "elsewhere");
    mkdirSync(elsewhere, { mode: 0o700 });
    symlinkSync(elsewhere, folder);
    expect(hook(input("/repo/docs/a.md"), fakeQmd(dir, { collections: REGISTERED }))).toMatchObject(
      {
        status: 0,
        stderr: "",
      },
    );
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(read()).toBe("");
    expect(existsSync(join(elsewhere, "pending"))).toBe(false);
  });

  it.each([
    ["without qmd", SYSTEM_PATH],
    ["with an empty PATH", ""],
  ])("stays silent %s", async (_case, path) => {
    expect(hook(input("/repo/docs/a.md"), path)).toMatchObject({
      status: 0,
      stdout: "",
      stderr: "",
    });
    // The worker drops the edit and lets go of the lock.
    await until(settled);
    expect(read()).toBe("");
  });

  it.each([
    ["a non-string file path", input(42)],
    ["empty input", ""],
    ["input that isn't JSON", "not json"],
  ])("ignores %s", (_case, stdin) => {
    expect(hook(stdin, fakeQmd(dir, { collections: REGISTERED }))).toMatchObject({
      status: 0,
      stdout: "",
      stderr: "",
    });
    expect(existsSync(folder)).toBe(false);
  });
});
