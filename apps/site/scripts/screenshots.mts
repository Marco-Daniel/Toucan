// `pnpm -C apps/site screenshots [--out <dir>] [--chrome <path>]`: after a
// build, serves build/client on localhost, opens every page in headless Chrome
// at 390, 768 and 1280 px wide (website/0012), saves a full-page screenshot of
// each, and fails when a page scrolls sideways or has a tap target smaller
// than 44 px outside running text. Local only: it needs Chrome.
//
// It starts one Chrome with its own temporary profile and stops only that
// process; nothing else is signalled.
// import libraries
import { spawn } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { extname, join, normalize } from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { parseArgs } from "node:util";

// import utils
import {
  errorText,
  tryCatch,
  tryCatchSync,
} from "../../extension/src/shared/async/tryCatch.util.ts";
import { isRecord } from "../../extension/src/shared/records/records.util.ts";

// import consts
import { PAGE_PATHS } from "../app/lib/pages.consts.ts";

const CLIENT = new URL("../build/client/", import.meta.url).pathname;
/** Phone, tablet and desktop (website/0012). */
const PHONE = 390;
const TABLET = 768;
const DESKTOP = 1280;
const WIDTHS = [PHONE, TABLET, DESKTOP] as const;
const OK = 200;
const NOT_FOUND = 404;
const VIEWPORT_HEIGHT = 900;
const MIN_TAP = 44;
const MOBILE_MAX_WIDTH = 500;
/** How long Chrome may take to start, and a page to settle. */
const STARTUP_MS = 15_000;
const POLL_MS = 100;
const SETTLE_MS = 300;
const DEFAULT_CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const TYPES: Record<string, string> = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".png": "image/png",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".json": "application/json",
};

const PAGES = PAGE_PATHS;

const { values } = parseArgs({
  options: {
    out: { type: "string", default: new URL("../build/screenshots/", import.meta.url).pathname },
    chrome: { type: "string", default: DEFAULT_CHROME },
  },
});
const { out } = values;
mkdirSync(out, { recursive: true });

/** build/client served as Netlify serves it: /path → path/index.html, unknown paths → 404.html. */
const server = createServer((request, response) => {
  const path = normalize(decodeURIComponent(new URL(request.url ?? "/", "http://x").pathname));
  const candidates = [path, join(path, "index.html")].map((file) => join(CLIENT, file));
  for (const file of candidates) {
    const [body] = tryCatchSync(() => readFileSync(file));
    if (body !== null && file.startsWith(CLIENT)) {
      response.writeHead(OK, {
        "content-type": TYPES[extname(file)] ?? "application/octet-stream",
      });
      response.end(body);
      return;
    }
  }
  response.writeHead(NOT_FOUND, { "content-type": "text/html" });
  response.end(readFileSync(join(CLIENT, "404.html")));
});
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
const origin = `http://127.0.0.1:${isRecord(address) ? String(address["port"]) : ""}`;

const profile = mkdtempSync(join(tmpdir(), "toucan-site-shots-"));
const chrome = spawn(
  values.chrome,
  [
    "--headless=new",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--hide-scrollbars",
    "about:blank",
  ],
  { stdio: "ignore" },
);

/** Stops the Chrome this script started (never anything else) and removes its profile. */
function cleanUp(): void {
  if (chrome.pid !== undefined && chrome.pid > 1 && chrome.exitCode === null) {
    chrome.kill("SIGKILL");
  }
  server.close();
  rmSync(profile, { recursive: true, force: true });
}

/** The DevTools port Chrome writes into its profile once it's listening. */
async function devToolsPort(): Promise<string> {
  const deadline = Date.now() + STARTUP_MS;
  while (Date.now() < deadline) {
    const [text] = tryCatchSync(() => readFileSync(join(profile, "DevToolsActivePort"), "utf8"));
    const port = text?.split("\n")[0];
    if (port !== undefined && port !== "") {
      return port;
    }
    await sleep(POLL_MS);
  }
  throw new Error("Chrome didn't start");
}

interface Cdp {
  send: (method: string, params?: Record<string, unknown>) => Promise<Record<string, unknown>>;
  close: () => void;
}

/** A minimal DevTools protocol client for one page target. */
async function connect(url: string): Promise<Cdp> {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let nextId = 0;
  const pending = new Map<number, (message: Record<string, unknown>) => void>();
  socket.addEventListener("message", (event) => {
    const message: unknown = JSON.parse(String(event.data));
    if (isRecord(message) && typeof message["id"] === "number") {
      pending.get(message["id"])?.(message);
      pending.delete(message["id"]);
    }
  });
  return {
    send: (method, params = {}) =>
      new Promise((resolve, reject) => {
        nextId++;
        pending.set(nextId, (message) => {
          const { error, result } = message;
          if (isRecord(error)) {
            reject(new Error(`${method}: ${String(error["message"])}`));
          } else {
            resolve(isRecord(result) ? result : {});
          }
        });
        socket.send(JSON.stringify({ id: nextId, method, params }));
      }),
    close: () => socket.close(),
  };
}

/** Runs JavaScript in the page and returns its JSON-serialisable value. */
async function evaluate(cdp: Cdp, expression: string): Promise<unknown> {
  const { result } = await cdp.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  return isRecord(result) ? result["value"] : undefined;
}

/** The page loaded, every image loaded (lazy ones too), and the fonts ready. */
const SETTLE = `(async () => {
  for (const image of document.images) image.loading = "eager";
  await Promise.all([...document.images].map((image) => image.complete ? null : new Promise((done) => { image.onload = image.onerror = done; })));
  await document.fonts.ready;
  return true;
})()`;

/** What a page does wrong at this width: sideways scroll, and small tap targets outside running text. */
const PROBLEMS = `(() => {
  const problems = [];
  const width = document.documentElement.scrollWidth;
  if (width > innerWidth) problems.push("scrolls sideways: " + width + " px wide in " + innerWidth);
  for (const element of document.querySelectorAll("a, button, summary")) {
    if (element.closest("p, li, td, .prose, h2")) continue;
    const box = element.getBoundingClientRect();
    if (box.width === 0 || getComputedStyle(element).visibility === "hidden") continue;
    if (box.height < ${MIN_TAP}) problems.push("tap target " + Math.round(box.height) + " px high: " + element.textContent.trim().slice(0, 40));
  }
  return problems;
})()`;

const failures: string[] = [];

const [, error] = await tryCatch(async () => {
  const port = await devToolsPort();
  const targets: unknown = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  const list: unknown[] = Array.isArray(targets) ? targets : [];
  const page = list.find((target) => isRecord(target) && target["type"] === "page");
  const socketUrl = isRecord(page) ? page["webSocketDebuggerUrl"] : undefined;
  if (typeof socketUrl !== "string") {
    throw new Error("No page target in Chrome");
  }
  const cdp = await connect(socketUrl);
  await cdp.send("Page.enable");
  for (const width of WIDTHS) {
    await cdp.send("Emulation.setDeviceMetricsOverride", {
      width,
      height: VIEWPORT_HEIGHT,
      deviceScaleFactor: 1,
      mobile: width < MOBILE_MAX_WIDTH,
    });
    for (const path of PAGES) {
      await cdp.send("Page.navigate", { url: `${origin}${path}` });
      await evaluate(
        cdp,
        "new Promise((done) => document.readyState === 'complete' ? done() : addEventListener('load', done))",
      );
      await evaluate(cdp, SETTLE);
      await sleep(SETTLE_MS);
      const problems = await evaluate(cdp, PROBLEMS);
      for (const problem of Array.isArray(problems) ? problems : []) {
        failures.push(`${path} at ${width} px: ${String(problem)}`);
      }
      const { cssContentSize } = await cdp.send("Page.getLayoutMetrics");
      const height = isRecord(cssContentSize) ? Number(cssContentSize["height"]) : VIEWPORT_HEIGHT;
      const { data } = await cdp.send("Page.captureScreenshot", {
        format: "png",
        captureBeyondViewport: true,
        clip: { x: 0, y: 0, width, height, scale: 1 },
      });
      const name = path === "/" ? "home" : path.slice(1).replaceAll("/", "-");
      writeFileSync(join(out, `${name}-${width}.png`), Buffer.from(String(data), "base64"));
    }
  }
  cdp.close();
});
cleanUp();
if (error !== null) {
  console.error(errorText(error));
  process.exit(1);
}
console.log(`${PAGES.length * WIDTHS.length} screenshots in ${out}`);
if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}
