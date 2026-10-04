// The built site served on localhost as Netlify serves it: /path is
// path/index.html, any other path gets the SPA fallback with a 404
// (public/_redirects), and every response carries the headers of _headers'
// `/*` rule, the Content-Security-Policy included. The screenshots script
// checks the pages through it, as a local stand-in for a deploy.
// import libraries
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

// import utils
import { tryCatchSync } from "../../extension/src/shared/async/tryCatch.util.ts";
import { isRecord } from "../../extension/src/shared/records/records.util.ts";
import { headersForAll } from "./csp.mts";

const OK = 200;
const BAD_REQUEST = 400;
const NOT_FOUND = 404;

/** The content type of each kind of file the build holds; nosniff makes the browser trust it. */
const TYPES: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".png": "image/png",
  ".gif": "image/gif",
};

/** A running local server for the built site. */
export interface BuildServer {
  origin: string;
  close: () => void;
}

/** Serves the build folder (absolute, ending in /) on a free localhost port. */
export async function serveBuild(client: string): Promise<BuildServer> {
  const headers = headersForAll(readFileSync(join(client, "_headers"), "utf8"));
  const server = createServer((request, response) => {
    // A malformed escape (/%E0) would throw here and stop the server mid-run.
    const [decoded] = tryCatchSync(() =>
      decodeURIComponent(new URL(request.url ?? "/", "http://x").pathname),
    );
    if (decoded === null) {
      response.writeHead(BAD_REQUEST, headers);
      response.end();
      return;
    }
    const path = normalize(decoded);
    const candidates = [path, join(path, "index.html")]
      .map((file) => join(client, file))
      .filter((file) => file.startsWith(client));
    for (const file of candidates) {
      const [body] = tryCatchSync(() => readFileSync(file));
      if (body !== null) {
        response.writeHead(OK, {
          ...headers,
          "content-type": TYPES[extname(file)] ?? "application/octet-stream",
        });
        response.end(body);
        return;
      }
    }
    response.writeHead(NOT_FOUND, { ...headers, "content-type": "text/html" });
    response.end(readFileSync(join(client, "__spa-fallback.html")));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  return {
    // From the address it bound, so a server listening beyond localhost shows.
    origin: isRecord(address)
      ? `http://${String(address["address"])}:${String(address["port"])}`
      : "",
    close: () => server.close(),
  };
}
