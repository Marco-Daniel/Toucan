import {
  chmod,
  link,
  lstat,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { unlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SettingsFileWriter } from "../../../src/features/settings/settingsWrite.util.ts";
import type { Clock } from "../../../src/features/settings/settingsWrite.util.ts";

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
  await chmod(dir, 0o755);
  await rm(dir, { recursive: true, force: true });
});

/**
 * A fake clock for the verify step: no real waiting. Each poll interval runs
 * `onSleep`, which is where a test lets VS Code's view catch up with the file
 * (or another writer step in).
 */
function fakeClock(onSleep: () => Promise<void> = async () => {}): Clock {
  let now = 0;
  return {
    now: () => now,
    sleep: async (ms) => {
      now += ms;
      await onSleep();
    },
  };
}

const TIMING = { verifyTimeoutMs: 4000, verifyPollMs: 100 };

/**
 * A writer for `file`. `view: "follows"` behaves like VS Code picking up the
 * file during the first poll interval; `"stale"` never does (the file isn't
 * this window's). `onSleep` runs during each poll interval. Records update().
 */
function setup(
  file: string,
  {
    view = "follows",
    dirty = [],
    onSleep,
  }: { view?: "follows" | "stale"; dirty?: string[]; onSleep?: () => Promise<void> } = {},
) {
  const updates: unknown[] = [];
  const debugs: string[] = [];
  const sleeps: number[] = [];
  const writer = new SettingsFileWriter(
    { profile: file, defaultProfile: file },
    {
      view: () => (view === "stale" ? VIEW : readKey(file)),
      update: async (_key, value) => {
        updates.push(value);
      },
      dirtyFiles: () => dirty,
      debug: (message) => debugs.push(message),
    },
    {
      ...TIMING,
      clock: fakeClock(async () => {
        sleeps.push(sleeps.length);
        if (view === "follows") {
          await refreshView(file);
        }
        await onSleep?.();
      }),
    },
  );
  return { writer, updates, debugs, sleeps };
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

const replace = () => ({ value: NEXT });
const isRecordForTest = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** The fallback reasons the writer logged, in order. */
const reasons = (debugs: string[]) =>
  debugs.map((message) => /in-place edit \((.*)\)$/.exec(message)?.[1]);
const REVERTED = "VS Code didn't pick up the edit; reverted it";
const CHANGED = "VS Code didn't pick up the edit, and the file changed since; left it";
const UNFOLLOWED = "VS Code didn't follow an earlier edit of this file";

/** A settings file with one commented object entry. */
const entry = (background: string) => `{
  "toucan.repos": {
    "webshop": {
      "background": "${background}", // orange
      "glyph": "heart",
    },
  },
}
`;

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
    const { writer, updates } = setup(file);
    await writer.write(KEY, replace, "profile");
    expect(await readFile(file, "utf8")).toBe(AFTER);
    expect((await stat(file)).mode & 0o777).toBe(0o640);
    expect((await stat(file)).ino).not.toBe(inode);
    expect(updates).toEqual([]);
  });

  it("changes one field of a commented repo entry in place, and VS Code's view confirms it", async () => {
    const file = join(dir, "settings.json");
    await writeFile(file, entry("#e0620b"));
    await refreshView(file);
    const { writer, updates } = setup(file);
    await writer.write(
      KEY,
      () => ({ value: { webshop: { background: "#101316", glyph: "heart" } } }),
      "profile",
    );
    expect(await readFile(file, "utf8")).toBe(entry("#101316"));
    expect(updates).toEqual([]);
  });

  it("writes through a symlink, keeping the link and the target's inode", async () => {
    const target = join(dir, "dotfiles.json");
    const file = join(dir, "settings.json");
    await writeFile(target, BEFORE);
    await symlink(target, file);
    const inode = (await stat(target)).ino;
    await refreshView(file);
    const { writer, updates } = setup(file);
    await writer.write(KEY, replace, "profile");
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
    const { writer } = setup(file);
    await writer.write(KEY, replace, "profile");
    expect((await stat(file)).nlink).toBe(2);
    expect(await readFile(other, "utf8")).toBe(AFTER);
  });

  it("reverts the edit and uses update() when VS Code never picks it up", async () => {
    const file = join(dir, "settings.json");
    await writeFile(file, BEFORE);
    const { writer, updates, sleeps } = setup(file, { view: "stale" });
    await writer.write(KEY, replace, "profile");
    expect(await readFile(file, "utf8")).toBe(BEFORE);
    expect(updates).toEqual([NEXT]);
    expect(sleeps).toHaveLength(40); // polled every 100 ms for the full 4 s
  });

  it("leaves a file someone else changed during the check, and uses update()", async () => {
    const file = join(dir, "settings.json");
    await writeFile(file, BEFORE);
    let edited: string | undefined;
    const { writer, updates } = setup(file, {
      view: "stale",
      onSleep: async () => {
        // Mid-verify, right after Toucan's edit landed.
        edited ??= await readFile(file, "utf8");
        await writeFile(file, "{ /* someone else */ }\n");
      },
    });
    await writer.write(KEY, replace, "profile");
    expect(edited).toBe(AFTER);
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
    const { writer, updates } = setup(file, { dirty: [target] });
    await writer.write(KEY, replace, "profile");
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
      { ...TIMING, clock: fakeClock() },
    );
    await writer.write(
      KEY,
      (current) => ({ value: { ...(current as object), webshop: "#14939c" } }),
      "profile",
    );
    // The fallback writes the value computed from the latest view, not the first.
    expect(updates).toEqual([{ other: "#654321", webshop: "#14939c" }]);
  });

  it("falls back to update() and leaves no temp file when the write fails", async () => {
    const file = join(dir, "settings.json");
    await writeFile(file, BEFORE);
    await refreshView(file);
    await chmod(dir, 0o555); // the temp file can't be created next to settings.json
    const { writer, updates } = setup(file);
    await writer.write(KEY, replace, "profile");
    await chmod(dir, 0o755);
    expect(updates).toEqual([NEXT]);
    expect(await readFile(file, "utf8")).toBe(BEFORE);
    expect(await readdir(dir)).toEqual(["settings.json"]);
  });

  // Needs a rename that fails after the temp file exists: an immutable target
  // (chflags) does that on macOS without root; Linux has no equivalent.
  it.skipIf(process.platform !== "darwin")(
    "removes its temp file when the rename fails",
    async () => {
      const file = join(dir, "settings.json");
      await writeFile(file, BEFORE);
      await refreshView(file);
      execFileSync("chflags", ["uchg", file]);
      try {
        const { writer, updates } = setup(file);
        await writer.write(KEY, replace, "profile");
        expect(updates).toEqual([NEXT]);
        expect(await readdir(dir)).toEqual(["settings.json"]);
      } finally {
        execFileSync("chflags", ["nouchg", file]);
      }
    },
  );

  it("uses update() when the settings file doesn't exist", async () => {
    const file = join(dir, "settings.json");
    fileCache.set(file, VIEW);
    const { writer, updates } = setup(file);
    await writer.write(KEY, replace, "profile");
    expect(updates).toEqual([NEXT]);
  });

  it("uses update() when the settings file disappears while planning", async () => {
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
            unlinkSync(file); // gone before the re-read
          }
          return VIEW;
        },
        update: async (_key, value) => {
          updates.push(value);
        },
        dirtyFiles: () => [],
        debug: () => {},
      },
      { ...TIMING, clock: fakeClock() },
    );
    await writer.write(KEY, replace, "profile");
    expect(updates).toEqual([NEXT]);
  });

  it("writes nothing when the recomputed value leaves the setting alone", async () => {
    const file = join(dir, "settings.json");
    await writeFile(file, BEFORE);
    const updates: unknown[] = [];
    let views = 0;
    let updaterCalls = 0;
    const writer = new SettingsFileWriter(
      { profile: file, defaultProfile: file },
      {
        view: () => {
          views++;
          if (views === 2) {
            writeFileSync(file, "{}\n");
          }
          return VIEW;
        },
        update: async (_key, value) => {
          updates.push(value);
        },
        dirtyFiles: () => [],
        debug: () => {},
      },
      { ...TIMING, clock: fakeClock() },
    );
    // First call computes a value; the recompute after the file changed says "leave alone".
    await writer.write(KEY, () => (++updaterCalls === 1 ? { value: NEXT } : undefined), "profile");
    expect(updaterCalls).toBe(2);
    expect(updates).toEqual([]);
    expect(await readFile(file, "utf8")).toBe("{}\n");
  });

  it("edits the file of the requested target", async () => {
    const profile = join(dir, "profile.json");
    const defaultProfile = join(dir, "default.json");
    await writeFile(profile, BEFORE);
    await writeFile(defaultProfile, BEFORE);
    await refreshView(defaultProfile);
    const writer = new SettingsFileWriter(
      { profile, defaultProfile },
      {
        view: () => readKey(defaultProfile),
        update: async () => {
          throw new Error("unexpected update()");
        },
        dirtyFiles: () => [],
        debug: () => {},
      },
      { ...TIMING, clock: fakeClock(() => refreshView(defaultProfile)) },
    );
    await writer.write(KEY, replace, "defaultProfile");
    expect(await readFile(defaultProfile, "utf8")).toBe(AFTER);
    expect(await readFile(profile, "utf8")).toBe(BEFORE);
  });

  it("goes straight to update() for a guessed file VS Code missed twice in a row", async () => {
    const file = join(dir, "settings.json");
    await writeFile(file, BEFORE);
    const { writer, updates, debugs } = setup(file, { view: "stale" });
    for (let i = 0; i < 3; i++) {
      await writer.write(KEY, replace, "profile");
    }
    expect(updates).toEqual([NEXT, NEXT, NEXT]);
    expect(reasons(debugs)).toEqual([REVERTED, REVERTED, UNFOLLOWED]);
    expect(await readFile(file, "utf8")).toBe(BEFORE);
  });

  it("never gives up on the default profile's file, which VS Code always follows", async () => {
    const file = join(dir, "settings.json");
    await writeFile(file, BEFORE);
    const { writer, debugs } = setup(file, { view: "stale" });
    for (let i = 0; i < 3; i++) {
      await writer.write(KEY, replace, "defaultProfile");
    }
    // The same path as the guessed profile file: its misses must not give that up either.
    await writer.write(KEY, replace, "profile");
    expect(reasons(debugs)).toEqual([REVERTED, REVERTED, REVERTED, REVERTED]);
  });

  it("still edits toucan.repos in place when both targets share a file given up on for colors", async () => {
    // A profile with its own settings but shared global state: both targets
    // resolve to the default profile's file, which VS Code follows for repos.
    const file = join(dir, "settings.json");
    await writeFile(file, BEFORE);
    let follows = false;
    const updates: unknown[] = [];
    const writer = new SettingsFileWriter(
      { profile: file, defaultProfile: file },
      {
        view: () => readKey(file),
        update: async (_key, value) => {
          updates.push(value);
        },
        dirtyFiles: () => [],
        debug: () => {},
      },
      {
        ...TIMING,
        clock: fakeClock(async () => {
          if (follows) {
            await refreshView(file);
          }
        }),
      },
    );
    await refreshView(file);
    await writer.write(KEY, replace, "profile"); // missed
    await writer.write(KEY, replace, "profile"); // missed again: given up for "profile"
    follows = true;
    await writer.write(KEY, replace, "defaultProfile");
    expect(updates).toEqual([NEXT, NEXT]);
    expect(await readFile(file, "utf8")).toBe(AFTER);
  });

  it("falls back with a value recomputed after the verify wait, keeping an edit saved meanwhile", async () => {
    const file = join(dir, "settings.json");
    await writeFile(file, BEFORE);
    const edited = { webshop: "#e0620b", other: "#654321" };
    let view: unknown = VIEW;
    const updates: unknown[] = [];
    const writer = new SettingsFileWriter(
      { profile: file, defaultProfile: file },
      {
        view: () => view,
        update: async (_key, value) => {
          updates.push(value);
        },
        dirtyFiles: () => [],
        debug: () => {},
      },
      {
        ...TIMING,
        clock: fakeClock(async () => {
          // VS Code missed Toucan's edit; then the user saves their own change.
          await writeFile(file, BEFORE.replace("#123456", "#654321"));
          view = edited;
        }),
      },
    );
    await writer.write(
      KEY,
      (current) => ({ value: { ...(current as object), webshop: "#14939c" } }),
      "profile",
    );
    expect(updates).toEqual([{ webshop: "#14939c", other: "#654321" }]);
  });

  it("skips the fallback when the recomputed value leaves the setting alone", async () => {
    const file = join(dir, "settings.json");
    await writeFile(file, BEFORE);
    let view: unknown = VIEW;
    const updates: unknown[] = [];
    const writer = new SettingsFileWriter(
      { profile: file, defaultProfile: file },
      {
        view: () => view,
        update: async (_key, value) => {
          updates.push(value);
        },
        dirtyFiles: () => [],
        debug: () => {},
      },
      {
        ...TIMING,
        clock: fakeClock(async () => {
          view = {}; // another window removed the entry meanwhile
        }),
      },
    );
    // Like Set Glyph: change the entry if it's still there, else leave it alone.
    await writer.write(
      KEY,
      (current) =>
        isRecordForTest(current) && "webshop" in current
          ? { value: { ...current, webshop: "#14939c" } }
          : undefined,
      "profile",
    );
    expect(updates).toEqual([]);
  });

  it("doesn't count a miss when someone else changed the file meanwhile", async () => {
    const file = join(dir, "settings.json");
    await writeFile(file, BEFORE);
    let interfere = true;
    const { writer, debugs } = setup(file, {
      view: "stale",
      onSleep: async () => {
        if (interfere) {
          await writeFile(file, `${BEFORE}\n`); // same settings, different text
        }
      },
    });
    await writer.write(KEY, replace, "profile");
    interfere = false;
    await writeFile(file, BEFORE);
    await writer.write(KEY, replace, "profile");
    await writer.write(KEY, replace, "profile");
    expect(reasons(debugs)).toEqual([CHANGED, REVERTED, REVERTED]);
  });

  it("keeps editing in place after one slow pickup, and starts counting again", async () => {
    const file = join(dir, "settings.json");
    await writeFile(file, BEFORE);
    const updates: unknown[] = [];
    const debugs: string[] = [];
    let follows = false;
    const writer = new SettingsFileWriter(
      { profile: file, defaultProfile: file },
      {
        view: () => readKey(file),
        update: async (_key, value) => {
          updates.push(value);
        },
        dirtyFiles: () => [],
        debug: (message) => debugs.push(message),
      },
      {
        ...TIMING,
        clock: fakeClock(async () => {
          if (follows) {
            await refreshView(file);
          }
        }),
      },
    );
    // VS Code is in sync before each write; `follow` says whether it picks up the edit in time.
    const write = async (value: Record<string, unknown>, follow: boolean) => {
      await refreshView(file);
      follows = follow;
      await writer.write(KEY, () => ({ value }), "profile");
    };
    await write(NEXT, false); // a slow pickup: missed once
    await write(NEXT, true);
    expect(await readFile(file, "utf8")).toBe(AFTER);
    expect(updates).toEqual([NEXT]);
    await write(VIEW, false); // missed once again, not twice in a row
    await write(VIEW, true);
    expect(await readFile(file, "utf8")).toBe(BEFORE);
    expect(updates).toEqual([NEXT, VIEW]);
  });

  it("serializes overlapping writes so neither edit is lost", async () => {
    const file = join(dir, "settings.json");
    await writeFile(file, BEFORE);
    await refreshView(file);
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
    expect(await readFile(file, "utf8")).toBe(
      AFTER.replace('"other": "#123456"', '"other": "#654321"'),
    );
    expect(updates).toEqual([]);
  });
});
