// Toucan's GitHub releases: fetched from the API and read into one shape, for
// the site's changelog page and the extension's CHANGELOG.md. The site, and the
// extension outside a release, fall back to the snapshot committed in
// apps/site/content/releases.json when GitHub fails.
// import utils
import { errorText, tryCatch } from "../../../apps/extension/src/shared/async/tryCatch.util.ts";
import { isRecord } from "../../../apps/extension/src/shared/records/records.util.ts";

/** A published release, as the changelog shows it. */
export interface Release {
  tag: string;
  name: string;
  /** ISO 8601. */
  publishedAt: string;
  url: string;
  /** The release notes, markdown. */
  body: string;
}

export const RELEASES_API =
  "https://api.github.com/repos/Marco-Daniel/Toucan/releases?per_page=100";

/** One request's limit, so a stalled GitHub fails the request instead of holding the build. */
const REQUEST_TIMEOUT_MS = 20_000;

/** One release from the GitHub API, or the snapshot's form; undefined for a draft, a pre-release or a malformed entry. */
function releaseFrom(entry: unknown): Release | undefined {
  if (!isRecord(entry) || entry["draft"] === true || entry["prerelease"] === true) {
    return undefined;
  }
  const tag = entry["tag_name"] ?? entry["tag"];
  const { name } = entry;
  const publishedAt = entry["published_at"] ?? entry["publishedAt"];
  const url = entry["html_url"] ?? entry["url"];
  const body = entry["body"] ?? "";
  return typeof tag === "string" &&
    typeof name === "string" &&
    typeof publishedAt === "string" &&
    typeof url === "string" &&
    typeof body === "string"
    ? { tag, name: name === "" ? tag : name, publishedAt, url, body }
    : undefined;
}

/** The published releases in the GitHub API's (or the snapshot's) answer, newest first. Throws when it isn't a list. */
export function parseReleases(data: unknown): Release[] {
  if (!Array.isArray(data)) {
    throw new Error("Expected a list of releases");
  }
  return data
    .flatMap((entry: unknown) => releaseFrom(entry) ?? [])
    .toSorted((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

interface LoadReleasesArgs {
  /** The GitHub API's answer; rejects when it can't be had. */
  fetchReleases: () => Promise<unknown>;
  /** The committed snapshot, used when GitHub fails. */
  snapshot: unknown;
  /** Told why the snapshot is used. */
  warn: (message: string) => void;
}

/** The releases from GitHub, or from the snapshot when that fails, and which one it was. */
export async function loadReleases({
  fetchReleases,
  snapshot,
  warn,
}: LoadReleasesArgs): Promise<{ releases: Release[]; source: "github" | "snapshot" }> {
  const [releases, error] = await tryCatch(async () => parseReleases(await fetchReleases()));
  if (error === null) {
    return { releases, source: "github" };
  }
  warn(`Changelog: using the committed snapshot, GitHub failed: ${errorText(error)}`);
  return { releases: parseReleases(snapshot), source: "snapshot" };
}

/** Releases per page, GitHub's most. */
const PER_PAGE = 100;
/** More pages than Toucan will have releases for; past it, something is wrong. */
const MAX_PAGES = 20;

interface FetchGitHubReleasesArgs {
  /** CI's token raises the rate limit; without one the request is anonymous. */
  token?: string | undefined;
  fetchFn?: typeof fetch;
}

interface FetchPageArgs {
  /** Empty for an anonymous request. */
  token: string;
  fetchFn: typeof fetch;
  page: number;
}

/** One page of the GitHub API's answer. Throws on a status other than 2xx. */
async function fetchPage({ token, fetchFn, page }: FetchPageArgs): Promise<unknown> {
  const response = await fetchFn(`${RELEASES_API}&page=${page}`, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: {
      accept: "application/vnd.github+json",
      ...(token === "" ? {} : { authorization: `Bearer ${token}` }),
    },
  });
  if (!response.ok) {
    throw new Error(`GitHub answered ${response.status}`);
  }
  // A body that isn't JSON fails without being quoted.
  const [data, error] = await tryCatch((): Promise<unknown> => response.json());
  if (error !== null) {
    throw new Error("GitHub answered with something that isn't JSON");
  }
  return data;
}

/** This page and every later one, joined; an answer that isn't a list comes back as it is. */
async function fetchPagesFrom(args: FetchPageArgs): Promise<unknown> {
  const data = await fetchPage(args);
  if (!Array.isArray(data)) {
    return data;
  }
  const releases: unknown[] = data;
  if (releases.length < PER_PAGE) {
    return releases;
  }
  if (args.page >= MAX_PAGES) {
    throw new Error(`GitHub has more than ${MAX_PAGES * PER_PAGE} releases`);
  }
  // Pages come one after another: the next one exists only if this one was full.
  const rest = await fetchPagesFrom({ ...args, page: args.page + 1 });
  return Array.isArray(rest) ? [...releases, ...(rest as unknown[])] : rest;
}

/** Every page of the GitHub API's answer, joined; an answer that isn't a list comes back as it is. */
export async function fetchGitHubReleases({
  token = process.env["GITHUB_TOKEN"],
  fetchFn = fetch,
}: FetchGitHubReleasesArgs = {}): Promise<unknown> {
  return fetchPagesFrom({ token: token ?? "", fetchFn, page: 1 });
}
