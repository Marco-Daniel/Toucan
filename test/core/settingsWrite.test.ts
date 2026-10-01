import {
  chmod,
  link,
  lstat,
  mkdtemp,
  readFile,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SettingsFileWriter } from "../../src/core/settingsWrite.ts";

const KEY = "toucan.repos";
const BEFORE = `{
  // my repos
  "toucan.repos": {
    "webshop": "#e0620b", // orange
    "other": "#123456",
  },
}
`;
const AFTER = `{
  // my repos
  "toucan.repos": {
    "webshop": "#14939c", // orange
    "other": "#123456",
  },
}
`;
const VIEW = { webshop: "#e0620b", other: "#123456" };
const NEXT = { webshop: "#14939c", other: "#123456" };

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "toucan-settings-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

/**
 * A writer for `file`. `view: "follows"` behaves like VS Code picking up the
 * file; `"stale"` never does (the file isn't this window's). Records update().
 */
function setup(
  file: string,
  { view = "follows", dirty = [] }: { view?: "follows" | "stale"; dirty?: string[] } = {},
) {
  const updates: unknown[] = [];
  const writer = new SettingsFileWriter(
    { profile: file, defaultProfile: file },
    {
      view: () => (view === "stale" ? VIEW : readKey(file)),
      update: async (_key, value) => {
        updates.push(value);
      },
      dirtyFiles: () => dirty,
      debug: () => {},
    },
    { verifyTimeoutMs: 300, verifyPollMs: 10 },
  );
  return { writer, updates };
}

/** What VS Code would see: the key's value in the file (comments stripped crudely). */
let fileCache = new Map<string, unknown>();
function readKey(file: string): unknown {
  return fileCache.get(file);
}
async function refreshView(file: string): Promise<void> {
  const text = await readFile(file, "utf8");
  const json = text.replace(/\/\/.*$/gm, "").replace(/,(\s*[}\]])/g, "$1");
  fileCache.set(file, (JSON.parse(json) as Record<string, unknown>)[KEY]);
}

/** Polls the file into the fake view like VS Code's watcher, until stopped. */
function watch(file: string): () => void {
  const timer = setInterval(() => {
    void refreshView(file).catch(() => undefined);
  }, 5);
  return () => clearInterval(timer);
}

const replace = () => ({ value: NEXT });

describe("SettingsFileWriter", () => {
  beforeEach(() => {
    fileCache = new Map();
  });

  it("edits a regular file in place via a renamed temp file, keeping comments and mode", async () => {
    const file = join(dir, "settings.json");
    await writeFile(file, BEFORE);
    await chmod(file, 0o640);
    const inode = (await stat(file)).ino;
    await refreshView(file);
    const stop = watch(file);
    const { writer, updates } = setup(file);
    await writer.write(KEY, replace, "profile");
    stop();
    expect(await readFile(file, "utf8")).toBe(AFTER);
    expect((await stat(file)).mode & 0o777).toBe(0o640);
    expect((await stat(file)).ino).not.toBe(inode);
    expect(updates).toEqual([]);
  });

  it("writes through a symlink, keeping the link and the target's inode", async () => {
    const target = join(dir, "dotfiles.json");
    const file = join(dir, "settings.json");
    await writeFile(target, BEFORE);
    await symlink(target, file);
    const inode = (await stat(target)).ino;
    await refreshView(file);
    const stop = watch(file);
    const { writer, updates } = setup(file);
    await writer.write(KEY, replace, "profile");
    stop();
    expect((await lstat(file)).isSymbolicLink()).toBe(true);
    expect(await readFile(target, "utf8")).toBe(AFTER);
    expect((await stat(target)).ino).toBe(inode);
    expect(updates).toEqual([]);
  });

  it("writes a hard-linked file in place, keeping the link", async () => {
    const file = join(dir, "settings.json");
    const other = join(dir, "hard.json");
    await writeFile(file, BEFORE);
    await link(file, other);
    await refreshView(file);
    const stop = watch(file);
    const { writer } = setup(file);
    await writer.write(KEY, replace, "profile");
    stop();
    expect((await stat(file)).nlink).toBe(2);
    expect(await readFile(other, "utf8")).toBe(AFTER);
  });

  it("reverts the edit and uses update() when VS Code never picks it up", async () => {
    const file = join(dir, "settings.json");
    await writeFile(file, BEFORE);
    const { writer, updates } = setup(file, { view: "stale" });
    await writer.write(KEY, replace, "profile");
    expect(await readFile(file, "utf8")).toBe(BEFORE);
    expect(updates).toEqual([NEXT]);
  });

  it("leaves a file someone else changed during the check, and uses update()", async () => {
    const file = join(dir, "settings.json");
    await writeFile(file, BEFORE);
    const { writer, updates } = setup(file, { view: "stale" });
    const writing = writer.write(KEY, replace, "profile");
    await new Promise((resolve) => setTimeout(resolve, 100)); // mid-verify
    await writeFile(file, "{ /* someone else */ }\n");
    await writing;
    expect(await readFile(file, "utf8")).toBe("{ /* someone else */ }\n");
    expect(updates).toEqual([NEXT]);
  });

  it("uses update() without touching a file that's open with unsaved changes, even via a symlink", async () => {
    const target = join(dir, "dotfiles.json");
    const file = join(dir, "settings.json");
    await writeFile(target, BEFORE);
    await symlink(target, file);
    await refreshView(file);
    // VS Code follows the file, so an in-place edit would stick: only the
    // dirty check keeps the file unchanged here.
    const stop = watch(file);
    const { writer, updates } = setup(file, { dirty: [target] });
    await writer.write(KEY, replace, "profile");
    stop();
    expect(await readFile(target, "utf8")).toBe(BEFORE);
    expect(updates).toEqual([NEXT]);
  });

  it("uses update() when the setting isn't in the file", async () => {
    const file = join(dir, "settings.json");
    await writeFile(file, '{\n  "editor.fontSize": 13,\n}\n');
    const { writer, updates } = setup(file);
    await writer.write(KEY, replace, "profile");
    expect(await readFile(file, "utf8")).toBe('{\n  "editor.fontSize": 13,\n}\n');
    expect(updates).toEqual([NEXT]);
  });

  it("does nothing when the updater leaves the setting alone or nothing changes", async () => {
    const file = join(dir, "settings.json");
    await writeFile(file, BEFORE);
    const inode = (await stat(file)).ino;
    await refreshView(file);
    const { writer, updates } = setup(file);
    await writer.write(KEY, () => undefined, "profile");
    await writer.write(KEY, () => ({ value: VIEW }), "profile");
    expect(await readFile(file, "utf8")).toBe(BEFORE);
    expect((await stat(file)).ino).toBe(inode);
    expect(updates).toEqual([]);
  });

  it("recomputes the value when the file changed between planning and writing", async () => {
    const file = join(dir, "settings.json");
    await writeFile(file, BEFORE);
    const updates: unknown[] = [];
    let views = 0;
    const writer = new SettingsFileWriter(
      { profile: file, defaultProfile: file },
      {
        view: () => {
          views++;
          if (views === 2) {
            // Another window saves while this one plans: the re-read sees it.
            writeFileSync(file, "{}\n");
            return VIEW;
          }
          return views >= 3 ? { other: "#654321" } : VIEW;
        },
        update: async (_key, value) => {
          updates.push(value);
        },
        dirtyFiles: () => [],
        debug: () => {},
      },
      { verifyTimeoutMs: 50, verifyPollMs: 10 },
    );
    await writer.write(
      KEY,
      (current) => ({ value: { ...(current as object), webshop: "#14939c" } }),
      "profile",
    );
    // The fallback writes the value computed from the latest view, not the first.
    expect(updates).toEqual([{ other: "#654321", webshop: "#14939c" }]);
  });

  it("serializes overlapping writes so neither edit is lost", async () => {
    const file = join(dir, "settings.json");
    await writeFile(file, BEFORE);
    await refreshView(file);
    const stop = watch(file);
    const { writer, updates } = setup(file);
    await Promise.all([
      writer.write(
        KEY,
        (current) => ({ value: { ...(current as object), webshop: "#14939c" } }),
        "profile",
      ),
      writer.write(
        KEY,
        (current) => ({ value: { ...(current as object), other: "#654321" } }),
        "profile",
      ),
    ]);
    stop();
    expect(await readFile(file, "utf8")).toBe(
      AFTER.replace('"other": "#123456"', '"other": "#654321"'),
    );
    expect(updates).toEqual([]);
  });
});
