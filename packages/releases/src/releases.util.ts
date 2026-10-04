// Toucan's GitHub releases: fetched from the API and read into one shape, for
// the site's changelog page and the extension's CHANGELOG.md.
// import utils
import { tryCatch } from "../../../apps/extension/src/shared/async/tryCatch.util.ts";
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

interface FetchGitHubReleasesArgs {
  /** CI's token raises the rate limit; without one the request is anonymous. */
  token?: string | undefined;
  fetchFn?: typeof fetch;
}

/** The GitHub API's answer. Throws on a status other than 2xx. */
export async function fetchGitHubReleases({
  token = process.env["GITHUB_TOKEN"],
  fetchFn = fetch,
}: FetchGitHubReleasesArgs = {}): Promise<unknown> {
  const response = await fetchFn(RELEASES_API, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: {
      accept: "application/vnd.github+json",
      ...(token === undefined || token === "" ? {} : { authorization: `Bearer ${token}` }),
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
