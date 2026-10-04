// import libraries
import { describe, expect, it } from "vitest";

// import utils
import { loadReleases } from "../../app/lib/releases.util.ts";

const api = (overrides: Record<string, unknown>) => ({
  tag_name: "v0.0.1",
  name: "Toucan 0.0.1",
  published_at: "2026-10-02T06:21:23Z",
  html_url: "https://github.com/Marco-Daniel/Toucan/releases/tag/v0.0.1",
  body: "First.",
  draft: false,
  prerelease: false,
  ...overrides,
});

describe("loadReleases", () => {
  const snapshot = [
    { tag: "v0.0.1", name: "Snap", publishedAt: "2026-10-02T06:21:23Z", url: "s", body: "" },
  ];

  it("uses GitHub's answer when it has one", async () => {
    const warnings: string[] = [];
    expect(
      await loadReleases({
        fetchReleases: () => Promise.resolve([api({ tag_name: "v9" })]),
        snapshot,
        warn: (message) => warnings.push(message),
      }),
    ).toMatchObject({ source: "github", releases: [{ tag: "v9" }] });
    expect(warnings).toEqual([]);
  });

  it("falls back to the snapshot, and says why, when GitHub fails or answers oddly", async () => {
    const warnings: string[] = [];
    const warn = (message: string) => warnings.push(message);
    expect(
      await loadReleases({
        fetchReleases: () => Promise.reject(new Error("GitHub answered 403")),
        snapshot,
        warn,
      }),
    ).toEqual({ source: "snapshot", releases: snapshot });
    expect(
      await loadReleases({ fetchReleases: () => Promise.resolve({}), snapshot, warn }),
    ).toEqual({
      source: "snapshot",
      releases: snapshot,
    });
    expect(warnings).toEqual([
      "Changelog: using the committed snapshot, GitHub failed: Error: GitHub answered 403",
      "Changelog: using the committed snapshot, GitHub failed: Error: Expected a list of releases",
    ]);
  });
});
