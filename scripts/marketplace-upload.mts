// `node scripts/marketplace-upload.mts verify|published <version>` and
// `node scripts/marketplace-upload.mts open`: the /marketplace-upload skill's
// steps, while a person uploads Toucan to the Marketplace by hand (ADR-0015).
// `verify` downloads a published release's VSIX and checks it as publish.yml's
// verify job does; `published` asks the Marketplace's public gallery, with no
// login, whether that version is live; `open` opens the publisher page in a
// private browser window. It never signs in anywhere, and never opens a browser
// on its own: only a private window, and only when asked. gh uses whatever
// account its caller set.
// import libraries
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// import utils
import {
  errorText,
  tryCatch,
  tryCatchSync,
} from "../apps/extension/src/shared/async/tryCatch.util.ts";
import { isRecord } from "../apps/extension/src/shared/records/records.util.ts";

export const REPO = "Marco-Daniel/Toucan";
export const EXTENSION_ID = "marco-daniel.toucan";
export const PUBLISHER_URL = "https://marketplace.visualstudio.com/manage/publishers/marco-daniel";
const GALLERY_QUERY = "https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery";
/** The gallery API's filter type for an extension's full name, and its flag for every version. */
const BY_NAME = 7;
const INCLUDE_VERSIONS = 1;
/** One request's limit. */
const REQUEST_TIMEOUT_MS = 20_000;
/** The first arguments, e.g. gh's `release download`, which name a failed call. */
const CALL_WORDS = 2;
/** After `node` and this script come the arguments. */
const FIRST_ARGUMENT = 2;

/** Whether the text is a plain release version, as in package.json: 1.0.0. */
export function isVersion(text: string): boolean {
  return /^\d+\.\d+\.\d+$/.test(text);
}

/** A version's VSIX, as package.yml names it. */
export function vsixName(version: string): string {
  return `toucan-${version}.vsix`;
}

/** The SHA-256 the release notes name (ADR-0013), or undefined unless they name exactly one. */
export function notesSha256(notes: string): string | undefined {
  const found = [...notes.matchAll(/^SHA-256: `([0-9a-f]{64})`$/gm)].map(([, sha256]) => sha256);
  return found.length === 1 ? found[0] : undefined;
}

/** A command that opens a URL. */
export interface OpenCommand {
  command: string;
  args: string[];
}

interface PrivateWindowCommandArgs {
  url: string;
  /** The apps installed, as /Applications names them (macOS). */
  apps: readonly string[];
}

/**
 * A command that opens the URL in a private window of an installed browser,
 * Chrome first, then Firefox; undefined when neither is installed, and the
 * URL is only printed. A normal window would bring a signed-in work account.
 */
export function privateWindowCommand({
  url,
  apps,
}: PrivateWindowCommandArgs): OpenCommand | undefined {
  if (apps.includes("Google Chrome.app")) {
    return { command: "open", args: ["-na", "Google Chrome", "--args", "--incognito", url] };
  }
  if (apps.includes("Firefox.app")) {
    return { command: "open", args: ["-na", "Firefox", "--args", "-private-window", url] };
  }
  return undefined;
}

/** The versions the gallery's answer lists for the extension, newest first as it gives them. */
export function galleryVersions(answer: unknown): string[] {
  const results: unknown = isRecord(answer) ? answer["results"] : undefined;
  const result: unknown = Array.isArray(results) ? results[0] : undefined;
  const extensions: unknown = isRecord(result) ? result["extensions"] : undefined;
  const extension: unknown = Array.isArray(extensions) ? extensions[0] : undefined;
  const versions = isRecord(extension) ? extension["versions"] : undefined;
  return (Array.isArray(versions) ? versions : []).flatMap((entry: unknown) =>
    isRecord(entry) && typeof entry["version"] === "string" ? [entry["version"]] : [],
  );
}

/** What the command line asks for. */
export type Command = { check: "verify" | "published"; version: string } | { check: "open" };

/** The step the command line asks for, with its version; undefined when it doesn't name one. */
export function parseCommand(args: readonly string[]): Command | undefined {
  const [check, version = ""] = args;
  if (check === "open" && args.length === 1) {
    return { check };
  }
  return (check === "verify" || check === "published") && isVersion(version)
    ? { check, version }
    : undefined;
}

/** What spawnSync reports about a run. */
export interface SpawnOutcome {
  /** Set when the program couldn't be started at all (not installed, say). */
  error?: Error | undefined;
  status: number | null;
  stdout: string | null;
  stderr: string | null;
}

interface CommandOutputArgs {
  program: string;
  args: readonly string[];
  outcome: SpawnOutcome;
}

/** A program's output, or an error that says which call failed and why. */
export function commandOutput({ program, args, outcome }: CommandOutputArgs): string {
  const call = [program, ...args.slice(0, CALL_WORDS)].join(" ");
  if (outcome.error !== undefined) {
    throw new Error(`${call} couldn't run: ${outcome.error.message}. Is ${program} installed?`);
  }
  if (outcome.status !== 0) {
    throw new Error(
      `${call} failed: ${(outcome.stderr ?? "").trim() || `exit ${String(outcome.status)}`}`,
    );
  }
  return outcome.stdout ?? "";
}

/** Runs gh with the caller's environment; throws when it can't run or fails. */
function gh(args: readonly string[]): string {
  return commandOutput({
    program: "gh",
    args,
    outcome: spawnSync("gh", args, { encoding: "utf8" }),
  });
}

/** What verifying a release needs from outside: gh, and reading the downloaded file. */
export interface VerifyPorts {
  /** Runs gh; throws when gh fails. */
  gh: (args: readonly string[]) => string;
  readFile: (path: string) => Uint8Array;
}

interface VerifyReleaseArgs {
  version: string;
  /** An empty folder to download into. */
  dir: string;
  ports: VerifyPorts;
}

/**
 * Downloads the release's VSIX and checks it as publish.yml's verify job does:
 * its release asset, the SHA-256 its notes name, and its attestation, with
 * the same pins. Returns its path and SHA-256; throws at the first failure.
 */
export function verifyRelease({ version, dir, ports }: VerifyReleaseArgs): {
  vsix: string;
  sha256: string;
} {
  const tag = `v${version}`;
  ports.gh([
    "release",
    "download",
    tag,
    "--repo",
    REPO,
    "--pattern",
    vsixName(version),
    "--dir",
    dir,
  ]);
  const vsix = join(dir, vsixName(version));
  ports.gh(["release", "verify-asset", tag, vsix, "--repo", REPO]);
  const sha256 = createHash("sha256").update(ports.readFile(vsix)).digest("hex");
  const named = notesSha256(
    ports.gh(["release", "view", tag, "--repo", REPO, "--json", "body", "--jq", ".body"]),
  );
  if (named !== sha256) {
    throw new Error(`The release notes name SHA-256 ${named ?? "none"}, the VSIX is ${sha256}`);
  }
  ports.gh([
    "attestation",
    "verify",
    vsix,
    "--repo",
    REPO,
    "--signer-workflow",
    `${REPO}/.github/workflows/package.yml`,
    "--source-ref",
    "refs/heads/main",
    "--deny-self-hosted-runners",
  ]);
  return { vsix, sha256 };
}

/** The versions the Marketplace lists for Toucan, from its public gallery API, with no login. */
export async function publishedVersions(fetchFn: typeof fetch = fetch): Promise<string[]> {
  const response = await fetchFn(GALLERY_QUERY, {
    method: "POST",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: {
      accept: "application/json;api-version=3.0-preview.1",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      filters: [{ criteria: [{ filterType: BY_NAME, value: EXTENSION_ID }] }],
      flags: INCLUDE_VERSIONS,
    }),
  });
  if (!response.ok) {
    throw new Error(`The Marketplace answered ${response.status}`);
  }
  return galleryVersions(await response.json());
}

if (import.meta.main) {
  const command = parseCommand(process.argv.slice(FIRST_ARGUMENT));
  if (command === undefined) {
    console.error(
      "Usage: node scripts/marketplace-upload.mts verify|published <version, e.g. 1.0.0> | open",
    );
    process.exit(1);
  }
  const [, error] = await tryCatch(async () => {
    if (command.check === "open") {
      // Only when asked, and only a private window: a normal one brings a signed-in work account.
      const [apps] = tryCatchSync(() => readdirSync("/Applications"));
      const open = privateWindowCommand({ url: PUBLISHER_URL, apps: apps ?? [] });
      if (open === undefined) {
        console.log(
          `No Chrome or Firefox found: open ${PUBLISHER_URL} in a private window yourself.`,
        );
        return;
      }
      commandOutput({
        program: open.command,
        args: open.args,
        outcome: spawnSync(open.command, open.args, { encoding: "utf8" }),
      });
      console.log(`Opened ${PUBLISHER_URL} in a private window.`);
      return;
    }
    const { check, version } = command;
    if (check === "verify") {
      // A fresh folder of the script's own, by version, in the OS temp folder.
      const dir = join(tmpdir(), `toucan-upload-${version}`);
      rmSync(dir, { recursive: true, force: true });
      mkdirSync(dir);
      const { vsix, sha256 } = verifyRelease({
        version,
        dir,
        ports: { gh, readFile: readFileSync },
      });
      console.log(
        [
          `Verified ${vsixName(version)}: it's v${version}'s release asset, its SHA-256 matches the notes, and package.yml attested it from main.`,
          `SHA-256: ${sha256}`,
          `File: ${vsix}`,
          `Upload it at ${PUBLISHER_URL}, in a private window.`,
        ].join("\n"),
      );
      return;
    }
    const versions = await publishedVersions();
    console.log(
      versions.includes(version)
        ? `The Marketplace lists ${EXTENSION_ID} ${version}.`
        : `The Marketplace doesn't list ${version} yet (it lists: ${versions.join(", ") || "nothing"}).`,
    );
    if (!versions.includes(version)) {
      process.exitCode = 1;
    }
  });
  if (error !== null) {
    console.error(errorText(error));
    process.exit(1);
  }
}
