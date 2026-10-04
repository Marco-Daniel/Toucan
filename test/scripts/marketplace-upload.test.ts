// The /marketplace-upload skill's script, with gh, the file and the gallery
// faked; the real calls are checked by hand around a real release.
// import libraries
import { describe, expect, it } from "vitest";

// import utils
import {
  EXTENSION_ID,
  galleryVersions,
  isVersion,
  notesSha256,
  parseCommand,
  PUBLISHER_URL,
  privateWindowCommand,
  publishedVersions,
  REPO,
  verifyRelease,
  vsixName,
} from "../../scripts/marketplace-upload.mts";

const SHA = "b139e00ef4d07559000a57c7237c4c9804e6c71152cc6399ab112511f69377d5";

describe("isVersion and vsixName", () => {
  it.each([
    ["1.0.0", true],
    ["10.20.30", true],
    ["v1.0.0", false],
    ["1.0", false],
    ["1.0.0-rc.1", false],
    ["", false],
  ])("%j is a release version: %s", (text, expected) => {
    expect(isVersion(text)).toBe(expected);
  });

  it("names the VSIX as package.yml does", () => {
    expect(vsixName("1.0.0")).toBe("toucan-1.0.0.vsix");
  });
});

describe("notesSha256", () => {
  it("reads the one SHA-256 line of the notes", () => {
    expect(notesSha256(`## Install\n\nSHA-256: \`${SHA}\`\n\nMore.`)).toBe(SHA);
  });

  it.each([
    ["no line", "## Install\n\nNo checksum."],
    ["two lines", `SHA-256: \`${SHA}\`\nSHA-256: \`${SHA}\``],
    ["the placeholder", "SHA-256: `{{sha256}}`"],
    ["upper-case hex", `SHA-256: \`${SHA.toUpperCase()}\``],
    ["the line after other text", `Its SHA-256: \`${SHA}\``],
    ["the line before other text", `SHA-256: \`${SHA}\` here`],
  ])("reads nothing from %s", (_what, notes) => {
    expect(notesSha256(notes)).toBeUndefined();
  });
});

describe("privateWindowCommand", () => {
  it("prefers Chrome's incognito window", () => {
    expect(
      privateWindowCommand({
        url: PUBLISHER_URL,
        apps: ["Safari.app", "Firefox.app", "Google Chrome.app"],
      }),
    ).toEqual({
      command: "open",
      args: ["-na", "Google Chrome", "--args", "--incognito", PUBLISHER_URL],
    });
  });

  it("uses Firefox's private window without Chrome", () => {
    expect(privateWindowCommand({ url: PUBLISHER_URL, apps: ["Firefox.app"] })).toEqual({
      command: "open",
      args: ["-na", "Firefox", "--args", "-private-window", PUBLISHER_URL],
    });
  });

  it("offers nothing with neither, so the URL is only printed", () => {
    expect(privateWindowCommand({ url: PUBLISHER_URL, apps: ["Safari.app"] })).toBeUndefined();
  });

  it("points at the marco-daniel publisher's page, for Toucan's repo and extension", () => {
    expect([PUBLISHER_URL, REPO, EXTENSION_ID]).toEqual([
      "https://marketplace.visualstudio.com/manage/publishers/marco-daniel",
      "Marco-Daniel/Toucan",
      "marco-daniel.toucan",
    ]);
  });
});

describe("galleryVersions", () => {
  it("lists the versions of the first extension in the answer", () => {
    expect(
      galleryVersions({
        results: [
          {
            extensions: [
              { versions: [{ version: "1.0.1" }, { version: "1.0.0" }, { other: 1 }] },
              { versions: [{ version: "9.9.9" }] },
            ],
          },
        ],
      }),
    ).toEqual(["1.0.1", "1.0.0"]);
  });

  it.each([
    ["an empty result", { results: [{ extensions: [] }] }],
    ["an extension without versions", { results: [{ extensions: [{}] }] }],
    ["no results", { results: [] }],
    ["something else", "not json"],
  ])("lists nothing for %s", (_what, answer) => {
    expect(galleryVersions(answer)).toEqual([]);
  });
});

/** The SHA-256 of the fake VSIX's bytes, "vsix bytes". */
const VSIX_SHA = "dc150bbc732db41eaab1f33a5577c9e147b912078f0cf1396c4ba3d80888169c";

/** A gh that records every call and answers `release view` with these notes. */
function fakeGh(notes: string) {
  const calls: string[][] = [];
  const ports = {
    gh: (args: readonly string[]) => {
      calls.push([...args]);
      return args[1] === "view" ? notes : "";
    },
    readFile: () => new TextEncoder().encode("vsix bytes"),
  };
  return { calls, ports };
}

describe("verifyRelease", () => {
  it("downloads the release's VSIX and checks the asset, the notes' SHA-256 and the attestation, with publish.yml's pins", () => {
    const { calls, ports } = fakeGh(`## Install\n\nSHA-256: \`${VSIX_SHA}\`\n`);
    expect(verifyRelease({ version: "1.0.0", dir: "/never/up", ports })).toEqual({
      vsix: "/never/up/toucan-1.0.0.vsix",
      sha256: VSIX_SHA,
    });
    expect(calls).toEqual([
      [
        "release",
        "download",
        "v1.0.0",
        "--repo",
        "Marco-Daniel/Toucan",
        "--pattern",
        "toucan-1.0.0.vsix",
        "--dir",
        "/never/up",
      ],
      [
        "release",
        "verify-asset",
        "v1.0.0",
        "/never/up/toucan-1.0.0.vsix",
        "--repo",
        "Marco-Daniel/Toucan",
      ],
      [
        "release",
        "view",
        "v1.0.0",
        "--repo",
        "Marco-Daniel/Toucan",
        "--json",
        "body",
        "--jq",
        ".body",
      ],
      [
        "attestation",
        "verify",
        "/never/up/toucan-1.0.0.vsix",
        "--repo",
        "Marco-Daniel/Toucan",
        "--signer-workflow",
        "Marco-Daniel/Toucan/.github/workflows/package.yml",
        "--source-ref",
        "refs/heads/main",
        "--deny-self-hosted-runners",
      ],
    ]);
  });

  it.each([
    ["another SHA-256", `SHA-256: \`${"0".repeat(64)}\``, "0".repeat(64)],
    ["none", "No checksum.", "none"],
  ])("stops before the attestation when the notes name %s", (_what, notes, named) => {
    const { calls, ports } = fakeGh(notes);
    expect(() => verifyRelease({ version: "1.0.0", dir: "/never/up", ports })).toThrow(
      `The release notes name SHA-256 ${named}, the VSIX is ${VSIX_SHA}`,
    );
    expect(calls.map((args) => args[1])).toEqual(["download", "verify-asset", "view"]);
  });

  it("stops at the first gh call that fails", () => {
    const calls: string[][] = [];
    const ports = {
      gh: (args: readonly string[]) => {
        calls.push([...args]);
        if (args[1] === "verify-asset") {
          throw new Error("gh release verify-asset failed: no attestations found");
        }
        return "";
      },
      readFile: () => new TextEncoder().encode("vsix bytes"),
    };
    expect(() => verifyRelease({ version: "1.0.0", dir: "/never/up", ports })).toThrow(
      "gh release verify-asset failed: no attestations found",
    );
    expect(calls.map((args) => args[1])).toEqual(["download", "verify-asset"]);
  });
});

describe("publishedVersions", () => {
  it("asks the public gallery for Toucan's versions, with no login", async () => {
    const requests: { url: string; init: RequestInit }[] = [];
    const fetchFn = ((url: string, init: RequestInit) => {
      requests.push({ url, init });
      return Promise.resolve(
        Response.json({ results: [{ extensions: [{ versions: [{ version: "1.0.0" }] }] }] }),
      );
    }) as typeof fetch;
    expect(await publishedVersions(fetchFn)).toEqual(["1.0.0"]);
    const [request] = requests;
    expect([
      request?.url,
      request?.init.method,
      new Headers(request?.init.headers).get("accept"),
      new Headers(request?.init.headers).get("content-type"),
      new Headers(request?.init.headers).has("authorization"),
      JSON.parse(typeof request?.init.body === "string" ? request.init.body : "null"),
    ]).toEqual([
      "https://marketplace.visualstudio.com/_apis/public/gallery/extensionquery",
      "POST",
      "application/json;api-version=3.0-preview.1",
      "application/json",
      false,
      { filters: [{ criteria: [{ filterType: 7, value: "marco-daniel.toucan" }] }], flags: 1 },
    ]);
  });

  it("throws with the status when the gallery refuses", async () => {
    const fetchFn = (() => Promise.resolve(new Response("{}", { status: 503 }))) as typeof fetch;
    await expect(publishedVersions(fetchFn)).rejects.toThrow("The Marketplace answered 503");
  });
});

describe("parseCommand", () => {
  it.each([
    [["verify", "1.0.0"], { check: "verify", version: "1.0.0" }],
    [["published", "2.3.4"], { check: "published", version: "2.3.4" }],
  ])("reads %j", (args, expected) => {
    expect(parseCommand(args)).toEqual(expected);
  });

  it.each([
    [["publish", "1.0.0"]],
    [["verify", "v1.0.0"]],
    [["verify"]],
    [[]],
    [["1.0.0", "verify"]],
  ])("refuses %j", (args) => {
    expect(parseCommand(args)).toBeUndefined();
  });
});
