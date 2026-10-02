// What the qmd script tests share: a child's env, the worker, qmd's cache
// folder and log, and a stand-in for qmd (never the real one). It logs each call,
// fails unless called on Toucan's own index (`--version` reads no index),
// prints `collections` for `collection list`, finds nothing for `collection
// show`, fails `collection add` when told to, and blocks `update` while
// `<dir>/hold` exists, so tests decide when an update finishes. With `tag`,
// each log line ends in ` @` plus that file's contents at the time of the call
// (nothing if it's missing), so a test can tell whose lock a call ran under.
import { spawn, spawnSync } from "node:child_process";
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { vi } from "vitest";

export const SYSTEM_PATH = "/usr/bin:/bin";

interface FakeQmdArgs {
  dir: string;
  collections?: string;
  failAdd?: boolean;
  tag?: string;
}

export function fakeQmd({ dir, collections = "", failAdd = false, tag = "" }: FakeQmdArgs): string {
  const bin = join(dir, "bin");
  const log = join(dir, "qmd.log");
  mkdirSync(bin, { recursive: true });
  writeFileSync(
    join(bin, "qmd"),
    [
      "#!/bin/sh",
      tag ? `T=" @$(cat "${tag}" 2>/dev/null)"` : 'T=""',
      `[ "$1" = --version ] && { echo "version$T" >> "${log}"; exit 0; }`,
      `[ "$1 $2" = "--index toucan" ] || { echo "wrong index: $*$T" >> "${log}"; exit 2; }`,
      "shift 2",
      `case "$1 $2" in`,
      `  "collection list") echo "collection list$T" >> "${log}"; printf '%s\\n' ${collections} ;;`,
      `  "collection show") echo "collection show$T" >> "${log}"; exit 1 ;;`,
      `  "collection add") echo "collection add$T" >> "${log}"; ${failAdd ? "exit 1" : "true"} ;;`,
      `  update*) echo "update start$T" >> "${log}"; while [ -e "${join(dir, "hold")}" ]; do sleep 0.02; done; echo "update end$T" >> "${log}" ;;`,
      `  *) echo "$1$T" >> "${log}" ;;`,
      "esac",
      "",
    ].join("\n"),
  );
  chmodSync(join(bin, "qmd"), 0o755);
  return `${bin}:${SYSTEM_PATH}`;
}

/** What the fake qmd logged in `dir`, or "" before its first call. */
export function readQmdLog(dir: string): string {
  const log = join(dir, "qmd.log");
  return existsSync(log) ? readFileSync(log, "utf8") : "";
}

/** Waits until `condition` holds, polling. */
export async function until(condition: () => boolean): Promise<void> {
  await vi.waitFor(
    () => {
      if (!condition()) {
        throw new Error("not yet");
      }
    },
    { timeout: 5000, interval: 20 },
  );
}

interface QmdEnvArgs {
  dir: string;
  path: string;
}

/** A child's env: only `path`, and `dir` as home and qmd's cache, so the lock is never the real one. */
export function qmdEnv({ dir, path }: QmdEnvArgs) {
  return { PATH: path, HOME: dir, XDG_CACHE_HOME: dir };
}

interface WorkerArgs {
  script: string;
  env: NodeJS.ProcessEnv;
}

/** Runs `script --worker` and waits for it. The timeout turns a worker that hangs into a failure. */
export function runWorker({ script, env }: WorkerArgs) {
  return spawnSync(process.execPath, [script, "--worker"], {
    env,
    encoding: "utf8",
    timeout: 10_000,
  });
}

/** Starts `script --worker` without waiting; resolves with its exit code. */
export function startWorker({ script, env }: WorkerArgs): Promise<number | null> {
  const worker = spawn(process.execPath, [script, "--worker"], {
    env,
    stdio: "ignore",
    timeout: 10_000,
  });
  return new Promise((resolve) => worker.on("close", resolve));
}

interface WriteCacheFileArgs {
  dir: string;
  name: string;
  text: string;
}

/** Creates `name` in qmd's cache folder under `dir`, as one of Toucan's qmd jobs would. */
export function writeCacheFile({ dir, name, text }: WriteCacheFileArgs): void {
  mkdirSync(join(dir, "qmd"), { recursive: true });
  writeFileSync(join(dir, "qmd", name), text);
}

/**
 * Points both places qmd's cache can come from at `dir`, for code that runs
 * in the test process: XDG_CACHE_HOME, and HOME for when XDG_CACHE_HOME is
 * unset (as a mutant may make it). Undo with vi.unstubAllEnvs().
 */
export function isolateQmdCache(dir: string): void {
  vi.stubEnv("HOME", dir);
  vi.stubEnv("XDG_CACHE_HOME", dir);
}
