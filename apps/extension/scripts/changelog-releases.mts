// Which releases CHANGELOG.md lists. Pure, so the release rule is tested:
// packaging a release reads GitHub or fails, because a changelog that missed a
// release would ship in the VSIX for good; anything else (CI, a local
// check:vsix) falls back to the site's committed snapshot like the site does.
// import utils
import { loadReleases, parseReleases } from "@toucan/releases/releases.util.ts";

// import types
import type { Release } from "@toucan/releases/releases.util.ts";

interface ChangelogReleasesArgs {
  /** Packaging a release: GitHub or nothing. */
  isRelease: boolean;
  /** GitHub's answer; rejects when it can't be had. */
  fetchReleases: () => Promise<unknown>;
  /** The committed snapshot, read only when it may be used. */
  readSnapshot: () => unknown;
  /** Told why the snapshot is used. */
  warn: (message: string) => void;
}

/** The published releases, newest first. */
export async function changelogReleases({
  isRelease,
  fetchReleases,
  readSnapshot,
  warn,
}: ChangelogReleasesArgs): Promise<Release[]> {
  if (isRelease) {
    return parseReleases(await fetchReleases());
  }
  const { releases } = await loadReleases({ fetchReleases, snapshot: readSnapshot(), warn });
  return releases;
}
