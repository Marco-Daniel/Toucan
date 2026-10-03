// The changelog's data: Toucan's GitHub releases, read at build time. When
// GitHub can't be reached or answers with something unexpected, the build
// uses the snapshot committed in content/releases.json instead of failing.
// import utils
import { errorText, tryCatch } from "../../../extension/src/shared/async/tryCatch.util.ts";
import { isRecord } from "../../../extension/src/shared/records/records.util.ts";

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

/** The GitHub API's answer, with the build's token when it has one (CI does; it raises the rate limit). */
export async function fetchGitHubReleases(): Promise<unknown> {
  const token = process.env["GITHUB_TOKEN"];
  const response = await fetch(RELEASES_API, {
    headers: {
      accept: "application/vnd.github+json",
      ...(token === undefined || token === "" ? {} : { authorization: `Bearer ${token}` }),
    },
  });
  if (!response.ok) {
    throw new Error(`GitHub answered ${response.status}`);
  }
  return response.json();
}
