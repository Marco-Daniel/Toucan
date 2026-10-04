// import libraries
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// import utils
import { serveBuild } from "../../scripts/serve.mts";

// import types
import type { BuildServer } from "../../scripts/serve.mts";

const BUILD = new URL("fixtures/build/", import.meta.url).pathname;

/** A request's status, body, and the two headers the fixture's _headers sets. */
async function get(server: BuildServer, path: string) {
  const response = await fetch(`${server.origin}${path}`);
  return [
    response.status,
    await response.text(),
    response.headers.get("x-frame-options"),
    response.headers.get("content-security-policy"),
  ];
}

describe("serveBuild", () => {
  let server: BuildServer;
  beforeAll(async () => {
    server = await serveBuild(BUILD);
  });
  afterAll(() => {
    server.close();
  });

  it("serves a page's index.html with the /* rule's headers", async () => {
    expect(await get(server, "/docs")).toEqual([
      200,
      "<p>docs</p>\n",
      "DENY",
      "default-src 'self'",
    ]);
  });

  it("answers an unknown path with the SPA fallback, a 404 and the headers", async () => {
    expect(await get(server, "/nope")).toEqual([
      404,
      "<p>not found</p>\n",
      "DENY",
      "default-src 'self'",
    ]);
  });

  it("answers a malformed escape with 400 and keeps serving", async () => {
    expect(await get(server, "/%E0")).toEqual([400, "", "DENY", "default-src 'self'"]);
    expect((await get(server, "/docs"))[0]).toBe(200);
  });
});
