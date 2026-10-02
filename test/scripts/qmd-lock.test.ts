import {
  chmodSync,
  lchmodSync,
  existsSync,
  lstatSync,
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
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  isPending,
  lockFolder,
  markPending,
  releaseLock,
  takeLock,
  takePending,
} from "../../scripts/qmd-lock.mts";

const realTmp = tmpdir();
let dir: string;
let folder: string;

beforeEach(() => {
  dir = mkdtempSync(join(realTmp, "toucan-lock-"));
  // os.tmpdir() reads TMPDIR on each call: the lock folder lands in this test's dir.
  process.env.TMPDIR = dir;
  folder = join(dir, `toucan-qmd-${process.getuid!()}`);
});
afterEach(() => {
  process.env.TMPDIR = realTmp;
  rmSync(dir, { recursive: true, force: true });
});

describe("the qmd lock", () => {
  it("lives in a private folder of this user's", () => {
    expect(lockFolder()).toBe(folder);
    expect(lstatSync(folder).mode & 0o777).toBe(0o700);
  });

  it("is held by one job at a time", () => {
    const first = takeLock();
    expect(first).toBeDefined();
    expect(takeLock()).toBeUndefined();
    releaseLock(first!);
    expect(takeLock()).toBeDefined();
  });

  it("only lets its owner release it", () => {
    const mine = takeLock()!;
    writeFileSync(join(folder, "lock"), "someone else");
    releaseLock(mine);
    expect(readFileSync(join(folder, "lock"), "utf8")).toBe("someone else");
  });

  it("takes over a lock left by a job that died", () => {
    takeLock();
    const tenMinutesAgo = new Date(Date.now() - 10 * 60_000);
    utimesSync(join(folder, "lock"), tenMinutesAgo, tenMinutesAgo);
    const lock = takeLock();
    expect(lock).toBeDefined();
    expect(readFileSync(join(folder, "lock"), "utf8")).toBe(lock!.token);
  });

  it("notes pending edits until they're taken", () => {
    markPending();
    expect(isPending(folder)).toBe(true);
    expect(takePending(folder)).toBe(true);
    expect([isPending(folder), takePending(folder)]).toEqual([false, false]);
  });
});

describe("the lock folder, against tampering", () => {
  it("isn't used when it's a symlink", () => {
    const elsewhere = join(dir, "elsewhere");
    mkdirSync(elsewhere, { mode: 0o700 });
    symlinkSync(elsewhere, folder);
    expect(lockFolder()).toBeUndefined();
    expect(takeLock()).toBeUndefined();
    markPending();
    expect(existsSync(join(elsewhere, "pending"))).toBe(false);
  });

  // A symlink's own mode is 0777 on Linux, so only macOS can make one look private.
  it.skipIf(process.platform !== "darwin")(
    "isn't used when it's a symlink that looks private",
    () => {
      const elsewhere = join(dir, "elsewhere");
      mkdirSync(elsewhere, { mode: 0o700 });
      symlinkSync(elsewhere, folder);
      lchmodSync(folder, 0o700);
      expect(lockFolder()).toBeUndefined();
    },
  );

  it("isn't used when others can get in", () => {
    mkdirSync(folder, { mode: 0o700 });
    chmodSync(folder, 0o755);
    expect(lockFolder()).toBeUndefined();
    expect(takeLock()).toBeUndefined();
  });

  it("never writes through a symlink planted at the pending note", () => {
    lockFolder();
    const victim = join(dir, "victim");
    writeFileSync(victim, "keep me");
    symlinkSync(victim, join(folder, "pending"));
    markPending();
    expect(readFileSync(victim, "utf8")).toBe("keep me");
  });

  it("never writes through a symlink planted at the lock", () => {
    lockFolder();
    const victim = join(dir, "victim");
    writeFileSync(victim, "keep me");
    symlinkSync(victim, join(folder, "lock"));
    expect(takeLock()).toBeUndefined();
    expect(readFileSync(victim, "utf8")).toBe("keep me");
  });
});
