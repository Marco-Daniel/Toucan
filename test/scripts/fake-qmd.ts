// A stand-in for qmd in the hook tests: never the real one. It logs each call,
// fails unless called on Toucan's own index (`--version` reads no index),
// prints `collections` for `collection list`, finds nothing for `collection
// show`, fails `collection add` when told to, and blocks `update` while
// `<dir>/hold` exists, so tests decide when an update finishes.
import { chmodSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const SYSTEM_PATH = "/usr/bin:/bin";

export function fakeQmd(dir: string, { collections = "", failAdd = false } = {}): string {
  const bin = join(dir, "bin");
  const log = join(dir, "qmd.log");
  mkdirSync(bin, { recursive: true });
  writeFileSync(
    join(bin, "qmd"),
    [
      "#!/bin/sh",
      `[ "$1" = --version ] && { echo version >> "${log}"; exit 0; }`,
      `[ "$1 $2" = "--index toucan" ] || { echo "wrong index: $*" >> "${log}"; exit 2; }`,
      "shift 2",
      `case "$1 $2" in`,
      `  "collection list") echo "collection list" >> "${log}"; printf '%s\\n' ${collections} ;;`,
      `  "collection show") echo "collection show" >> "${log}"; exit 1 ;;`,
      `  "collection add") echo "collection add" >> "${log}"; ${failAdd ? "exit 1" : "true"} ;;`,
      `  update*) echo "update start" >> "${log}"; while [ -e "${join(dir, "hold")}" ]; do sleep 0.02; done; echo "update end" >> "${log}" ;;`,
      `  *) echo "$1" >> "${log}" ;;`,
      "esac",
      "",
    ].join("\n"),
  );
  chmodSync(join(bin, "qmd"), 0o755);
  return `${bin}:${SYSTEM_PATH}`;
}
