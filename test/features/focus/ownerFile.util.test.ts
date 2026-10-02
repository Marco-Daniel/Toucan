import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createOwnerFile } from "../../../src/features/focus/ownerFile.util.ts";

let dir: string;
beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "toucan-owner-"));
});
afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("createOwnerFile", () => {
  it("round-trips the owner between windows", async () => {
    const storage = join(dir, "globalStorage"); // not created yet
    await createOwnerFile({ directory: storage, id: "a" }).writeOwner("window-a");
    expect(await createOwnerFile({ directory: storage, id: "b" }).readOwner()).toBe("window-a");
    expect(JSON.parse(await readFile(join(storage, "owner.json"), "utf8"))).toEqual({
      window: "window-a",
    });
    expect(await readdir(storage)).toEqual(["owner.json"]);
  });

  it("lets the latest writer win", async () => {
    await createOwnerFile({ directory: dir, id: "a" }).writeOwner("window-a");
    await createOwnerFile({ directory: dir, id: "b" }).writeOwner("window-b");
    expect(await createOwnerFile({ directory: dir, id: "a" }).readOwner()).toBe("window-b");
  });

  it("lets windows write at the same time without sharing a temp file", async () => {
    const ids = Array.from({ length: 20 }, (_, i) => `window-${i}`);
    await Promise.all(ids.map((id) => createOwnerFile({ directory: dir, id }).writeOwner(id)));
    expect(ids).toContain(await createOwnerFile({ directory: dir, id: "x" }).readOwner());
    expect(await readdir(dir)).toEqual(["owner.json"]);
  });

  it.each([
    ["a missing file", undefined],
    ["garbage", "{ not json"],
    ["null", "null"],
    ["a non-string window", '{"window": 42}'],
    ["no window", '{"win": "window-a"}'],
  ])("reads %s as no owner", async (_case, text) => {
    if (text !== undefined) {
      await writeFile(join(dir, "owner.json"), text);
    }
    expect(await createOwnerFile({ directory: dir, id: "a" }).readOwner()).toBeUndefined();
  });

  it("fails a write it can't make and leaves no temp file", async () => {
    await mkdir(join(dir, "owner.json")); // the rename onto it fails
    await expect(
      createOwnerFile({ directory: dir, id: "a" }).writeOwner("window-a"),
    ).rejects.toMatchObject({
      code: "EISDIR",
    });
    expect(await readdir(dir)).toEqual(["owner.json"]);
  });
});
