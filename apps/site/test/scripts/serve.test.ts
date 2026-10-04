// import libraries
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// import utils
import { serveBuild } from "../../scripts/serve.mts";

// import types
import type { BuildServer } from "../../scripts/serve.mts";

const BUILD = new URL("fixtures/client/", import.meta.url).pathname;

/** A request's status, body, content type, and the two headers the fixture's _headers sets. */
async function get(server: BuildServer, path: string) {
  const response = await fetch(`${server.origin}${path}`);
  return [
    response.status,
    await response.text(),
    response.headers.get("content-type"),
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

  it("listens on localhost only", () => {
    expect(server.origin).toMatch(/^http:\/\/127\.0\.0\.1:\d+$/);
  });

  it("serves a page's index.html with the /* rule's headers", async () => {
    expect(await get(server, "/docs")).toEqual([
      200,
      "<p>docs</p>\n",
      "text/html",
      "DENY",
      "default-src 'self'",
    ]);
  });

  it("answers an unknown path with the SPA fallback, a 404 and the headers", async () => {
    expect(await get(server, "/nope")).toEqual([
      404,
      "<p>not found</p>\n",
      "text/html",
      "DENY",
      "default-src 'self'",
    ]);
  });

  it.each([
    ["/assets/a.css", "text/css"],
    ["/assets/a.js", "text/javascript"],
    ["/assets/a.png", "image/png"],
    ["/assets/a.gif", "image/gif"],
    ["/assets/a.data", "application/octet-stream"],
  ])("serves %s as %s", async (path, type) => {
    // Status and type only: Stryker's sandbox prepends a line to the .js fixture.
    const [status, , contentType] = await get(server, path);
    expect([status, contentType]).toEqual([200, type]);
  });

  it("answers a malformed escape with 400 and keeps serving", async () => {
    expect(await get(server, "/%E0")).toEqual([400, "", null, "DENY", "default-src 'self'"]);
    expect((await get(server, "/docs"))[0]).toBe(200);
  });
});

describe("a closed build server", () => {
  it("refuses new requests", async () => {
    const server = await serveBuild(BUILD);
    server.close();
    await expect(fetch(`${server.origin}/docs`)).rejects.toThrow("fetch failed");
  });
});
