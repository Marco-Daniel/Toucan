// The site's repository links must lead where the extension's manifest says the
// repository is: the nav, the footer, the install section and the changelog use them.
// import libraries
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// import consts
import { RELEASES_URL, REPO_URL } from "../../app/lib/site.consts.ts";

const manifest = JSON.parse(
  readFileSync(new URL("../../../extension/package.json", import.meta.url), "utf8"),
);
/** The manifest's repository as a web address: its git URL without `.git`. */
const repository: string = manifest.repository.url.replace(/\.git$/, "");

describe("the repository links", () => {
  it("point REPO_URL at the repository the extension's manifest names", () => {
    expect(REPO_URL).toBe(repository);
  });

  it("point RELEASES_URL at that repository's releases page", () => {
    expect(RELEASES_URL).toBe(`${repository}/releases`);
  });
});
