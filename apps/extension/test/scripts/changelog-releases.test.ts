// import libraries
import { describe, expect, it } from "vitest";

// import utils
import { changelogReleases } from "../../scripts/changelog-releases.mts";

const release = (tag: string) => ({
  tag_name: tag,
  name: tag,
  published_at: "2026-10-02T06:21:23Z",
  html_url: `https://github.com/Marco-Daniel/Toucan/releases/tag/${tag}`,
  body: "",
});
const SNAPSHOT = [release("v0.0.1")];
const offline = () => Promise.reject(new Error("fetch failed"));

describe("changelogReleases", () => {
  it("packaging a release reads GitHub, and never the snapshot", async () => {
    const reads: string[] = [];
    expect(
      await changelogReleases({
        isRelease: true,
        fetchReleases: () => Promise.resolve([release("v0.0.2")]),
        readSnapshot: () => reads.push("snapshot"),
        warn: () => {},
      }),
    ).toMatchObject([{ tag: "v0.0.2" }]);
    expect(reads).toEqual([]);
  });

  it("packaging a release fails when GitHub can't be read, without a word about the snapshot", async () => {
    const reads: string[] = [];
    const warnings: string[] = [];
    await expect(
      changelogReleases({
        isRelease: true,
        fetchReleases: offline,
        readSnapshot: () => {
          reads.push("snapshot");
          return SNAPSHOT;
        },
        warn: (message) => warnings.push(message),
      }),
    ).rejects.toThrow("fetch failed");
    expect([reads, warnings]).toEqual([[], []]);
  });

  it("anything else falls back to the snapshot when GitHub can't be read, and says so", async () => {
    const warnings: string[] = [];
    expect(
      await changelogReleases({
        isRelease: false,
        fetchReleases: offline,
        readSnapshot: () => SNAPSHOT,
        warn: (message) => warnings.push(message),
      }),
    ).toMatchObject([{ tag: "v0.0.1" }]);
    expect(warnings).toEqual([
      "Changelog: using the committed snapshot, GitHub failed: Error: fetch failed",
    ]);
  });
});
