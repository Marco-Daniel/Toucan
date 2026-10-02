import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const HOOK = new URL("../../scripts/docs-bootstrap-hook.mts", import.meta.url).pathname;
const SYSTEM_PATH = "/usr/bin:/bin";

let dir: string;
let log: string;
let lock: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "toucan-bootstrap-"));
  log = join(dir, "qmd.log");
  // The hooks keep their lock in the OS temp dir: this test's own.
  lock = join(dir, "toucan-qmd-update.lock");
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

/**
 * A stand-in for qmd (never the real one): `--version` reads no index, and
 * anything else fails unless it's on Toucan's own index. `collections` is what
 * `collection list` prints; `collection show` finds nothing.
 */
function fakeQmd(collections = ""): string {
  const bin = join(dir, "bin");
  mkdirSync(bin, { recursive: true });
  writeFileSync(
    join(bin, "qmd"),
    [
      "#!/bin/sh",
      `[ "$1" = --version ] && { echo version >> "${log}"; exit 0; }`,
      `[ "$1 $2" = "--index toucan" ] || { echo "wrong index: $*" >> "${log}"; exit 2; }`,
      "shift 2",
      `echo "$1 $2" >> "${log}"`,
      `[ "$1 $2" = "collection list" ] && printf '%s\\n' ${collections}`,
      `[ "$1 $2" = "collection show" ] && exit 1`,
      "exit 0",
      "",
    ].join("\n"),
  );
  chmodSync(join(bin, "qmd"), 0o755);
  return `${bin}:${SYSTEM_PATH}`;
}

/** Runs the hook as Claude Code would at session start. */
function start(path: string) {
  return spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ hook_event_name: "SessionStart", source: "startup" }),
    env: { PATH: path, TMPDIR: dir },
    encoding: "utf8",
  });
}

const read = () => (existsSync(log) ? readFileSync(log, "utf8") : "");

/** The log once the background worker has finished (`until` seen, lock released). */
async function finished(until: string): Promise<string> {
  await vi.waitFor(
    () => {
      if (!read().includes(until) || existsSync(lock)) {
        throw new Error("still running");
      }
    },
    { timeout: 5000, interval: 25 },
  );
  return read();
}

describe("the docs bootstrap hook", () => {
  it("registers Toucan's collections and builds the keyword index when there are none", async () => {
    expect(start(fakeQmd())).toMatchObject({ status: 0, stdout: "", stderr: "" });
    const steps = (await finished("update")).trim().split("\n");
    expect(steps.slice(0, 4)).toEqual([
      "version",
      "collection list",
      "collection show",
      "collection show",
    ]);
    expect(steps.filter((step) => step === "collection add")).toHaveLength(2);
    expect(steps.at(-1)).toBe("update");
    expect(steps.some((step) => step.startsWith("embed"))).toBe(false);
  });

  it("does nothing more once Toucan's collections are registered", async () => {
    start(fakeQmd("'toucan-docs (qmd://toucan-docs/)'"));
    await finished("collection list");
    expect(read()).toBe("version\ncollection list\n");
  });

  it("stays silent without qmd", async () => {
    expect(start(SYSTEM_PATH)).toMatchObject({ status: 0, stdout: "", stderr: "" });
    await vi.waitFor(
      () => {
        if (existsSync(lock)) {
          throw new Error("still running");
        }
      },
      { timeout: 3000, interval: 25 },
    );
    expect(read()).toBe("");
  });

  it("leaves the work to a qmd job that's already running", async () => {
    writeFileSync(lock, "");
    start(fakeQmd());
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(read()).toBe("");
    expect(existsSync(lock)).toBe(true);
  });
});
