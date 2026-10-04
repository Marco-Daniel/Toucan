// The changelog's data: Toucan's GitHub releases, read at build time. When
// GitHub can't be reached or answers with something unexpected, the build
// uses the snapshot committed in content/releases.json instead of failing.
// import utils
import { parseReleases } from "@toucan/releases/releases.util.ts";
import { errorText, tryCatch } from "../../../extension/src/shared/async/tryCatch.util.ts";

// import types
import type { Release } from "@toucan/releases/releases.util.ts";

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
