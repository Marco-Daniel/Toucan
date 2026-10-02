import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SYSTEM_PATH, fakeQmd } from "./fake-qmd.ts";

const HOOK = new URL("../../scripts/docs-bootstrap-hook.mts", import.meta.url).pathname;

let dir: string;
let folder: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "toucan-bootstrap-"));
  folder = join(dir, `toucan-qmd-${process.getuid!()}`);
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

/** Runs the hook as Claude Code would at session start. */
function start(path: string) {
  return spawnSync(process.execPath, [HOOK], {
    input: JSON.stringify({ hook_event_name: "SessionStart", source: "startup" }),
    env: { PATH: path, TMPDIR: dir, HOME: dir },
    encoding: "utf8",
  });
}

const read = () =>
  existsSync(join(dir, "qmd.log")) ? readFileSync(join(dir, "qmd.log"), "utf8") : "";

/** The log once the worker is done: it created the lock folder and released the lock. */
async function done(): Promise<string> {
  await vi.waitFor(
    () => {
      if (!existsSync(folder) || existsSync(join(folder, "lock"))) {
        throw new Error("still running");
      }
    },
    { timeout: 5000, interval: 20 },
  );
  return read();
}

const steps = (log: string) => log.trim().split("\n");

describe("the docs bootstrap hook", () => {
  it("registers Toucan's collections and builds the keyword index when there are none", async () => {
    expect(start(fakeQmd(dir))).toMatchObject({ status: 0, stdout: "", stderr: "" });
    const log = steps(await done());
    expect(log.slice(0, 4)).toEqual([
      "version",
      "collection list",
      "collection show",
      "collection show",
    ]);
    expect(log.filter((step) => step === "collection add")).toHaveLength(2);
    expect(log.slice(-2)).toEqual(["update start", "update end"]);
    expect(log.some((step) => step.startsWith("embed"))).toBe(false);
  });

  it("finishes registering when only some of the collections are there", async () => {
    start(fakeQmd(dir, { collections: "'toucan-docs (qmd://toucan-docs/)'" }));
    expect(steps(await done()).filter((step) => step === "collection add")).toHaveLength(2);
  });

  it("does nothing more once all of Toucan's collections are registered", async () => {
    start(
      fakeQmd(dir, {
        collections: "'toucan-docs (qmd://toucan-docs/)' 'toucan-guides (qmd://toucan-guides/)'",
      }),
    );
    expect(await done()).toBe("version\ncollection list\n");
  });

  it("stops at the first qmd command that fails", async () => {
    start(fakeQmd(dir, { failAdd: true }));
    const log = steps(await done());
    expect(log.filter((step) => step === "collection add")).toHaveLength(1);
    expect(log.some((step) => step.startsWith("update"))).toBe(false);
  });

  it("stays silent without qmd", async () => {
    expect(start(SYSTEM_PATH)).toMatchObject({ status: 0, stdout: "", stderr: "" });
    expect(await done()).toBe("");
  });

  it("leaves the work to a qmd job that's already running", async () => {
    mkdirSync(folder, { mode: 0o700 });
    writeFileSync(join(folder, "lock"), "another job");
    start(fakeQmd(dir));
    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(read()).toBe("");
    expect(readFileSync(join(folder, "lock"), "utf8")).toBe("another job");
  });
});
