// `pnpm -C apps/site releases:snapshot`: refreshes content/releases.json, the
// changelog's fallback when the build can't reach GitHub. Run it after a
// release and commit the result; the build itself never writes it.
// import libraries
import { writeFileSync } from "node:fs";

// import utils
import { fetchGitHubReleases, parseReleases } from "@toucan/releases/releases.util.ts";

/** Indent of the written JSON. */
const JSON_INDENT = 2;

const releases = parseReleases(await fetchGitHubReleases());
writeFileSync(
  new URL("../content/releases.json", import.meta.url),
  `${JSON.stringify(releases, null, JSON_INDENT)}\n`,
);
console.log(
  `content/releases.json: ${releases.length} releases, newest ${releases[0]?.tag ?? "none"}`,
);
