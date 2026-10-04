// The releases, fetched once per build and shared by every page that shows them.
// import utils
import { fetchGitHubReleases, loadReleases } from "@toucan/releases/releases.util.ts";

// import consts
import SNAPSHOT from "../../content/releases.json";

// import types
import type { Release } from "@toucan/releases/releases.util.ts";

let releases: Promise<Release[]> | undefined;

/** Toucan's releases, newest first: from GitHub, or the committed snapshot when that fails. */
export function buildReleases(): Promise<Release[]> {
  releases ??= loadReleases({
    fetchReleases: () => fetchGitHubReleases(),
    snapshot: SNAPSHOT,
    warn: (message) => console.warn(message),
  }).then((loaded) => loaded.releases);
  return releases;
}
