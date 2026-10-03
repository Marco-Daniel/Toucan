// Deploys build/client to Netlify through its file-digest API, with no
// dependencies beyond Node (website/0010): announce every file's SHA-1, upload
// the ones Netlify doesn't have, then wait until the deploy is ready. The
// deploy only goes live once every file it needs has arrived, so a failed
// upload stops the run before anything is published.
//
// The logic here talks to Netlify through a port, so the tests can make it
// disagree; scripts/deploy.mts is the command that gives it the real one.
// import libraries
import { createHash } from "node:crypto";
import { lstatSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { isAbsolute, join, relative, sep } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

// import utils
import { errorText, tryCatch } from "../../extension/src/shared/async/tryCatch.util.ts";
import { isRecord } from "../../extension/src/shared/records/records.util.ts";

const NETLIFY_API = "https://api.netlify.com/api/v1";
const POLL_MS = 2000;
const TIMEOUT_MS = 300_000;
const MS_PER_SECOND = 1000;
/** One request's limit, so a stalled connection fails the step instead of holding it. */
const REQUEST_TIMEOUT_MS = 60_000;
/** Files the site can't go live without (the home page, the fallback every unknown path gets, the security headers): a deploy missing one is a broken build. */
const REQUIRED_PAGES = ["/index.html", "/__spa-fallback.html", "/_redirects", "/_headers"];

/** A file to deploy: its site path ("/docs/index.html"), its bytes' SHA-1 and where to read it. */
export interface DeployFile {
  path: string;
  sha1: string;
  file: string;
}

/** Whether a path, relative to the build, stays inside it: not the build itself, not above it, not elsewhere. */
export function isInsideBuild(relativePath: string): boolean {
  return relativePath !== "" && !relativePath.startsWith("..") && !isAbsolute(relativePath);
}

/**
 * Every file under the root, as a deploy file. Throws on a symlink or any
 * path that resolves outside the root, so the deploy can't read anything else.
 */
export function listFiles(root: string): DeployFile[] {
  const base = realpathSync(root);
  return readdirSync(base, { recursive: true, encoding: "utf8" }).flatMap((name) => {
    const file = join(base, name);
    const stats = lstatSync(file);
    if (stats.isSymbolicLink()) {
      throw new Error(`Refusing to deploy a symlink: ${name}`);
    }
    // A second guard behind the symlink check: the resolved file must still be in the build.
    const inside = relative(base, realpathSync(file));
    if (!isInsideBuild(inside)) {
      throw new Error(`Refusing to deploy a path outside the build: ${name}`);
    }
    if (!stats.isFile()) {
      return [];
    }
    const sha1 = createHash("sha1").update(readFileSync(file)).digest("hex");
    return [{ path: `/${inside.split(sep).join("/")}`, sha1, file }];
  });
}

interface UploadPlanArgs {
  files: readonly DeployFile[];
  /** The digests Netlify doesn't have yet. */
  required: readonly string[];
}

/** The files to upload for the digests Netlify asked for. Throws when it asks for one this build doesn't have. */
export function uploadPlan({ files, required }: UploadPlanArgs): DeployFile[] {
  const unknown = required.filter((sha1) => !files.some((candidate) => candidate.sha1 === sha1));
  if (unknown.length > 0) {
    throw new Error(`Netlify asked for ${unknown.length} file(s) this build doesn't have`);
  }
  // Files with the same content share a digest; Netlify needs it once.
  return required.flatMap((sha1) => files.find((candidate) => candidate.sha1 === sha1) ?? []);
}

/** A deploy as Netlify reports it. */
export interface DeployStatus {
  id: string;
  state: string;
  required: string[];
  errorMessage?: string;
}

export interface UploadFileArgs {
  deployId: string;
  /** The file's site path, "/docs/index.html". */
  path: string;
  bytes: Uint8Array;
}

/** What the deploy needs from Netlify; the tests replace it. */
export interface NetlifyPort {
  createDeploy(digests: Record<string, string>): Promise<DeployStatus>;
  uploadFile(args: UploadFileArgs): Promise<void>;
  getDeploy(deployId: string): Promise<DeployStatus>;
}

interface DeployArgs {
  files: readonly DeployFile[];
  netlify: NetlifyPort;
  read?: (file: string) => Uint8Array;
  wait?: (ms: number) => Promise<unknown>;
  now?: () => number;
  pollMs?: number;
  timeoutMs?: number;
  log?: (message: string) => void;
}

/** Creates the deploy, uploads every file it needs, then waits until it's ready. Throws on any failure. */
export async function deploy({
  files,
  netlify,
  read = (file) => readFileSync(file),
  wait = sleep,
  now = Date.now,
  pollMs = POLL_MS,
  timeoutMs = TIMEOUT_MS,
  log = console.log,
}: DeployArgs): Promise<DeployStatus> {
  const missing = REQUIRED_PAGES.filter((page) => !files.some(({ path }) => path === page));
  if (missing.length > 0) {
    throw new Error(`Refusing to deploy a build without ${missing.join(" and ")}`);
  }
  const created = await netlify.createDeploy(
    Object.fromEntries(files.map(({ path, sha1 }) => [path, sha1])),
  );
  const uploads = uploadPlan({ files, required: created.required });
  log(`Deploy ${created.id}: ${files.length} files, ${uploads.length} to upload`);
  for (const { path, file } of uploads) {
    await netlify.uploadFile({ deployId: created.id, path, bytes: read(file) });
  }
  const deadline = now() + timeoutMs;
  for (;;) {
    // A failed poll is retried until the deadline: the deploy may be fine.
    const [status, error] = await tryCatch(() => netlify.getDeploy(created.id));
    if (status?.state === "ready") {
      return status;
    }
    if (status?.state === "error") {
      throw new Error(`Deploy ${created.id} failed: ${status.errorMessage ?? "no reason given"}`);
    }
    if (now() >= deadline) {
      const last = error === null ? `still ${status.state}` : `status unknown: ${errorText(error)}`;
      throw new Error(
        `Deploy ${created.id} wasn't ready after ${timeoutMs / MS_PER_SECOND} s (${last})`,
      );
    }
    await wait(pollMs);
  }
}

/** A deploy from Netlify's JSON; throws on anything without an id and a state. */
export function deployStatus(data: unknown): DeployStatus {
  if (!isRecord(data) || typeof data["id"] !== "string" || typeof data["state"] !== "string") {
    throw new Error("Netlify answered without a deploy id and state");
  }
  const required = Array.isArray(data["required"])
    ? data["required"].filter((sha1) => typeof sha1 === "string")
    : [];
  const message = data["error_message"];
  return {
    id: data["id"],
    state: data["state"],
    required,
    ...(typeof message === "string" ? { errorMessage: message } : {}),
  };
}

interface RedactArgs {
  text: string;
  token: string;
}

/** The token removed from any text, in case an error ever echoes it. */
export function redact({ text, token }: RedactArgs): string {
  return token === "" ? text : text.replaceAll(token, "[redacted]");
}

interface AnswerJsonArgs {
  response: Response;
  /** The method and endpoint, for the error. */
  call: string;
}

/** An answer's JSON; a body that isn't JSON fails without being quoted. */
async function answerJson({ response, call }: AnswerJsonArgs): Promise<unknown> {
  const [data, error] = await tryCatch((): Promise<unknown> => response.json());
  if (error !== null) {
    throw new Error(`Netlify ${call} answered with something that isn't JSON`);
  }
  return data;
}

interface NetlifyApiArgs {
  token: string;
  siteId: string;
  fetchFn?: typeof fetch;
}

/** The real Netlify API. Errors name the method, the endpoint and the status, never a body or a header. */
export function netlifyApi({ token, siteId, fetchFn = fetch }: NetlifyApiArgs): NetlifyPort {
  if (!/^[\w-]+$/.test(siteId)) {
    throw new Error("NETLIFY_SITE_ID isn't a Netlify site id");
  }
  const request = async (method: string, endpoint: string, body: BodyInit, contentType: string) => {
    const [response, error] = await tryCatch(() =>
      fetchFn(`${NETLIFY_API}${endpoint}`, {
        method,
        headers: { authorization: `Bearer ${token}`, "content-type": contentType },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        ...(method === "GET" ? {} : { body }),
      }),
    );
    if (error !== null) {
      throw new Error(
        redact({ text: `Netlify ${method} ${endpoint} failed: ${errorText(error)}`, token }),
      );
    }
    if (!response.ok) {
      throw new Error(`Netlify ${method} ${endpoint} answered ${response.status}`);
    }
    return response;
  };
  return {
    createDeploy: async (digests) => {
      const response = await request(
        "POST",
        `/sites/${siteId}/deploys`,
        JSON.stringify({ files: digests }),
        "application/json",
      );
      return deployStatus(await answerJson({ response, call: `POST /sites/${siteId}/deploys` }));
    },
    uploadFile: async ({ deployId, path, bytes }) => {
      const encoded = path.split("/").map(encodeURIComponent).join("/");
      await request(
        "PUT",
        `/deploys/${encodeURIComponent(deployId)}/files${encoded}`,
        // A copy on its own ArrayBuffer: fetch takes no view of a shared or Node pool buffer.
        new Uint8Array(bytes),
        "application/octet-stream",
      );
    },
    getDeploy: async (deployId) => {
      const response = await request(
        "GET",
        `/deploys/${encodeURIComponent(deployId)}`,
        "",
        "application/json",
      );
      return deployStatus(
        await answerJson({ response, call: `GET /deploys/${encodeURIComponent(deployId)}` }),
      );
    },
  };
}
