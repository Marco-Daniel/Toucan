// import libraries
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// import utils
import {
  fetchGitHubReleases,
  loadReleases,
  parseReleases,
  RELEASES_API,
} from "../../app/lib/releases.util.ts";

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

describe("parseReleases", () => {
  it("keeps the published releases, newest first, in the changelog's form", () => {
    expect(
      parseReleases([
        api({}),
        api({
          tag_name: "v0.0.3",
          name: "",
          published_at: "2026-10-03T00:24:32Z",
          html_url: "u3",
          body: null,
        }),
        api({ tag_name: "v0.1.0-rc", prerelease: true }),
        api({ tag_name: "v0.2.0", draft: true }),
        api({ tag_name: 5 }),
        "not a release",
      ]),
    ).toEqual([
      { tag: "v0.0.3", name: "v0.0.3", publishedAt: "2026-10-03T00:24:32Z", url: "u3", body: "" },
      {
        tag: "v0.0.1",
        name: "Toucan 0.0.1",
        publishedAt: "2026-10-02T06:21:23Z",
        url: "https://github.com/Marco-Daniel/Toucan/releases/tag/v0.0.1",
        body: "First.",
      },
    ]);
  });

  it("reads the snapshot's own form back unchanged", () => {
    const release = {
      tag: "v1",
      name: "One",
      publishedAt: "2026-01-01T00:00:00Z",
      url: "u",
      body: "b",
    };
    expect(parseReleases([release])).toEqual([release]);
  });

  it.each([
    ["name", { name: 5 }],
    ["published_at", { published_at: null }],
    ["html_url", { html_url: undefined }],
    ["body", { body: 7 }],
  ])("leaves out a release whose %s isn't text", (_field, overrides) => {
    expect(parseReleases([api(overrides)])).toEqual([]);
  });

  it("throws when the answer isn't a list", () => {
    expect(() => parseReleases({ message: "API rate limit exceeded" })).toThrow(
      "Expected a list of releases",
    );
  });
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

function fakeFetch(response: Response) {
  const requests: { url: string; headers: Headers; signal: unknown }[] = [];
  const fetchFn = ((url: string, init: RequestInit) => {
    requests.push({ url, headers: new Headers(init.headers), signal: init.signal });
    return Promise.resolve(response);
  }) as typeof fetch;
  return { fetchFn, requests };
}

describe("fetchGitHubReleases", () => {
  // The runner's own GITHUB_TOKEN (CI sets one) must not reach these tests.
  beforeEach(() => {
    vi.stubEnv("GITHUB_TOKEN", "");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("asks the releases API with the token, and returns its JSON", async () => {
    const { fetchFn, requests } = fakeFetch(Response.json([{ tag_name: "v1" }]));
    expect(await fetchGitHubReleases({ token: "t0k", fetchFn })).toEqual([{ tag_name: "v1" }]);
    expect(
      requests.map(({ url, headers }) => [
        url,
        headers.get("accept"),
        headers.get("authorization"),
      ]),
    ).toEqual([[RELEASES_API, "application/vnd.github+json", "Bearer t0k"]]);
    expect(RELEASES_API).toBe(
      "https://api.github.com/repos/Marco-Daniel/Toucan/releases?per_page=100",
    );
  });

  it("takes the token from GITHUB_TOKEN by default, as CI sets it", async () => {
    vi.stubEnv("GITHUB_TOKEN", "from-env");
    const { fetchFn, requests } = fakeFetch(Response.json([]));
    await fetchGitHubReleases({ fetchFn });
    expect(requests[0]?.headers.get("authorization")).toBe("Bearer from-env");
  });

  it("asks without authorization when there's no token", async () => {
    for (const token of [undefined, ""]) {
      const { fetchFn, requests } = fakeFetch(Response.json([]));
      await fetchGitHubReleases({ token, fetchFn });
      expect(requests[0]?.headers.has("authorization")).toBe(false);
    }
  });

  it("fails on an answer that isn't JSON without quoting it, and gives the request a timeout", async () => {
    const { fetchFn, requests } = fakeFetch(new Response("<html>secret</html>", { status: 200 }));
    await expect(fetchGitHubReleases({ token: "", fetchFn })).rejects.toThrow(
      /^GitHub answered with something that isn't JSON$/,
    );
    expect(requests[0]?.signal).toBeInstanceOf(AbortSignal);
  });

  it("throws with the status when GitHub refuses", async () => {
    const { fetchFn } = fakeFetch(new Response("{}", { status: 403 }));
    await expect(fetchGitHubReleases({ token: "", fetchFn })).rejects.toThrow(
      "GitHub answered 403",
    );
  });
});
