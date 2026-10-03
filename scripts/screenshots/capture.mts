// `pnpm screenshots`: regenerates the README images in media/readme/ from the
// real extension. It installs the freshly packaged VSIX into a throwaway VS
// Code (its own user-data-dir and extensions-dir under a temp folder, removed
// afterwards), opens three demo repositories with neutral names, drives the
// windows over the DevTools protocol, and captures only those windows' pages,
// never the screen. macOS only for now: pass `--app <VS Code.app>` if VS Code
// isn't in /Applications, and `--frames <dir>` to also get the hero's frames
// (and, on a failure, what each window showed) as PNGs.
// import libraries
import { mkdirSync, rmSync } from "node:fs";

// import utils
import { captureFailure, captureStills, OUT, recordHero } from "./scenes.mts";
import { connect, freePort, killGroup, launch, makePaths, setUp, stop } from "./session.mts";
import { errorText, tryCatch } from "../../src/shared/async/tryCatch.util.ts";

// import types
import type { ChildProcess } from "node:child_process";
import type { Session } from "./session.mts";

const DEFAULT_APP = "/Applications/Visual Studio Code.app";
/** The whole run; past it everything is killed and the run fails. */
const RUN_TIMEOUT_MS = 300_000;
const MS_PER_SECOND = 1000;
/** After `node` and this script come the arguments. */
const FIRST_ARGUMENT = 2;

interface RunArgs {
  app: string;
  vsix: string;
  framesDir: string | undefined;
}

async function run({ app, vsix, framesDir }: RunArgs): Promise<void> {
  const paths = makePaths(app);
  mkdirSync(OUT, { recursive: true });
  let child: ChildProcess | undefined;
  let session: Session | undefined;
  const deadline = setTimeout(() => {
    console.error(`Gave up after ${RUN_TIMEOUT_MS / MS_PER_SECOND} s.`);
    if (child?.pid !== undefined) {
      killGroup({ pid: child.pid, signal: "SIGKILL" });
    }
    rmSync(paths.temp, { recursive: true, force: true });
    process.exit(1);
  }, RUN_TIMEOUT_MS);
  const [, error] = await tryCatch(async () => {
    setUp({ paths, vsix });
    const ports = { paths, pagePort: await freePort(), mainPort: await freePort() };
    child = launch(ports);
    session = await connect(ports);
    await session.main.sizeWindows();
    console.log("Recording the hero");
    await recordHero({ session, framesDir });
    console.log("Capturing the stills");
    await captureStills({ session, paths });
  });
  if (error !== null && session && framesDir !== undefined) {
    const failed = session;
    await tryCatch(() => captureFailure({ session: failed, dir: framesDir }));
  }
  if (child) {
    await stop(child);
  }
  clearTimeout(deadline);
  rmSync(paths.temp, { recursive: true, force: true });
  if (error !== null) {
    throw error;
  }
}

if (import.meta.main) {
  const args = process.argv.slice(FIRST_ARGUMENT);
  const option = (flag: string) => {
    const at = args.indexOf(flag);
    return at === -1 ? undefined : args[at + 1];
  };
  const vsix = option("--vsix");
  if (vsix === undefined) {
    console.error(
      "Usage: node scripts/screenshots/capture.mts --vsix <file> [--app <VS Code.app>] [--frames <dir>]",
    );
    process.exit(1);
  }
  const [, error] = await tryCatch(() =>
    run({ app: option("--app") ?? DEFAULT_APP, vsix, framesDir: option("--frames") }),
  );
  if (error !== null) {
    console.error(errorText(error));
    process.exit(1);
  }
}
