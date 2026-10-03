// `pnpm -C apps/site screenshots [--out <dir>] [--chrome <path>]`: after a
// build, serves build/client on localhost, opens every page in headless Chrome
// at 390, 768 and 1280 px wide (website/0012), saves a full-page screenshot of
// each, and fails when a page scrolls sideways, has anything running past the
// right edge, has a tap target smaller than 44 px outside running text, or
// gets the not-found page or the phone menu wrong. Local only: it needs Chrome.
//
// It starts one Chrome with its own temporary profile and stops only the
// processes that name that profile: Chrome on macOS hands itself over to a new
// process, so the one it spawned isn't the one to stop. It asks Chrome to
// close first and kills what's left after that.
// import libraries
import { spawn, spawnSync } from "node:child_process";
import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
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
import { chromePids, parsePs, planSweep, PROFILE_PREFIX, runSweep } from "./chrome.mts";

// import consts
import { PAGE_PATHS } from "../app/lib/pages.consts.ts";

// import types
import type { EntryFacts } from "./chrome.mts";

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
/** A whole run takes about a minute; past this it has hung. */
const RUN_TIMEOUT_MS = 300_000;
const MS_PER_SECOND = 1000;
/** The shell's exit status for a run ended by a signal: 128 + SIGINT. */
const EXIT_INTERRUPTED = 130;
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

/** Paths the site doesn't have: each must show the not-found page once, in one page frame. */
const MISSING = ["/docs/nope", "/nope"];
const PAGES = [...PAGE_PATHS, ...MISSING];

const { values } = parseArgs({
  options: {
    out: { type: "string", default: new URL("../build/screenshots/", import.meta.url).pathname },
    chrome: { type: "string", default: DEFAULT_CHROME },
  },
});
const { out } = values;
mkdirSync(out, { recursive: true });

/** build/client served as Netlify serves it: /path → path/index.html, any other path → the SPA fallback with a 404 (public/_redirects). */
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
  response.end(readFileSync(join(CLIENT, "__spa-fallback.html")));
});
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
const origin = `http://127.0.0.1:${isRecord(address) ? String(address["port"]) : ""}`;

/** The temp folder by its real path, so the profile path matches Chrome's command line exactly. */
const TMP = realpathSync(tmpdir());

/** One `ps -axo` listing, every process with the given columns. */
function ps(columns: string): string {
  return spawnSync("ps", ["-axo", columns], { encoding: "utf8" }).stdout ?? "";
}

/** The running processes from ps: each one's argv and the executable it runs. */
function processes() {
  return parsePs({ commands: ps("pid=,command="), programs: ps("pid=,comm=") });
}

/** lstat of a temp folder entry, or undefined when it can't be read. */
function entryFacts(path: string): EntryFacts | undefined {
  const [stats] = tryCatchSync(() => lstatSync(path));
  return stats === null
    ? undefined
    : {
        isFolder: stats.isDirectory() && !stats.isSymbolicLink(),
        uid: stats.uid,
        ageMs: Date.now() - stats.mtimeMs,
      };
}

// What earlier runs left behind: old profiles of ours are removed, anything
// else is only listed, and a possibly leftover Chrome stops the run.
const isClear = runSweep({
  plan: planSweep({
    names: readdirSync(TMP),
    tmp: TMP,
    processes: processes(),
    chrome: values.chrome,
    facts: entryFacts,
    uid: process.getuid?.() ?? -1,
    maxAgeMs: RUN_TIMEOUT_MS,
  }),
  removeDir: (path) => rmSync(path, { recursive: true, force: true }),
  report: (line) => console.error(line),
});
if (!isClear) {
  process.exit(1);
}

const profile = mkdtempSync(join(TMP, PROFILE_PREFIX));
// Stopped by cleanUp through its profile, not through this child (see the header).
spawn(
  values.chrome,
  [
    "--headless=new",
    "--remote-debugging-port=0",
    `--user-data-dir=${profile}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--hide-scrollbars",
    // No keychain prompt: macOS would otherwise ask for the profile's keys and stall the run.
    "--use-mock-keychain",
    "about:blank",
  ],
  { stdio: "ignore" },
);

/** The pids of the processes whose command line names this run's profile: its Chrome and Chrome's helpers. */
function chromeProcesses(): number[] {
  return chromePids({ processes: processes(), profile, chrome: values.chrome, self: process.pid });
}

/** Closes this run's Chrome (never anything else), waits for it to go, kills what's left, removes its profile. */
let isCleaned = false;

async function cleanUp(port: string | undefined): Promise<void> {
  if (isCleaned) {
    return;
  }
  isCleaned = true;
  if (port !== undefined) {
    await tryCatch(async () => {
      const version: unknown = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
      const url = isRecord(version) ? version["webSocketDebuggerUrl"] : undefined;
      if (typeof url === "string") {
        const browser = await connect(url);
        await tryCatch(() => browser.send("Browser.close"));
        browser.close();
      }
    });
  }
  const deadline = Date.now() + STARTUP_MS;
  while (chromeProcesses().length > 0 && Date.now() < deadline) {
    await sleep(POLL_MS);
  }
  for (const pid of chromeProcesses()) {
    tryCatchSync(() => process.kill(pid, "SIGKILL"));
  }
  const killed = Date.now() + STARTUP_MS;
  while (chromeProcesses().length > 0 && Date.now() < killed) {
    await sleep(POLL_MS);
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
    // Only answers to our own requests: an id this script issued, with its own callback.
    const id = isRecord(message) ? message["id"] : undefined;
    const settle = typeof id === "number" ? pending.get(id) : undefined;
    if (isRecord(message) && typeof id === "number" && typeof settle === "function") {
      pending.delete(id);
      settle(message);
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
  // html and body clip sideways overflow, which hides it from scrollWidth: look for
  // elements past the right edge that no scrolling or clipping box inside the page holds.
  const held = (element) => {
    for (let box = element.parentElement; box && box !== document.body; box = box.parentElement) {
      if (getComputedStyle(box).overflowX !== "visible") return box.getBoundingClientRect().right <= innerWidth + 1;
    }
    return false;
  };
  // Code that doesn't fit its own box (a command clipped inside its card, say).
  for (const code of document.querySelectorAll("code, pre")) {
    if (code.closest("pre") !== code && code.closest("pre")) continue;
    const scrolls = getComputedStyle(code).overflowX === "auto" || getComputedStyle(code).overflowX === "scroll";
    if (!scrolls && code.scrollWidth > code.clientWidth + 1) problems.push("code doesn't fit its box: " + code.textContent.trim().slice(0, 40));
  }
  for (const element of document.body.querySelectorAll("*")) {
    const box = element.getBoundingClientRect();
    const parent = element.parentElement.getBoundingClientRect();
    if (box.width > 0 && box.right > innerWidth + 1 && parent.right <= innerWidth + 1 && !held(element)) {
      problems.push("runs past the edge: <" + element.tagName.toLowerCase() + "> " + (element.textContent || "").trim().slice(0, 40));
    }
  }
  for (const element of document.querySelectorAll("a, button, summary")) {
    if (element.closest("p, li, td, .prose, h2")) continue;
    const box = element.getBoundingClientRect();
    // Not shown: hidden, or visually hidden until focused (the skip link).
    if (box.width <= 1 || getComputedStyle(element).visibility === "hidden") continue;
    if (box.height < ${MIN_TAP}) problems.push("tap target " + Math.round(box.height) + " px high: " + element.textContent.trim().slice(0, 40));
  }
  return problems;
})()`;

const failures: string[] = [];

/** The site menu's state: whether it's open, and the page's path. */
const MENU_STATE = `[document.querySelector('nav[aria-label="Site"] details').open, location.pathname]`;
const OPEN_MENU = `document.querySelector('nav[aria-label="Site"] summary').click()`;

/**
 * At phone width, the menu closes on Escape, on a press outside it, and when
 * a link in it navigates. Returns what didn't happen.
 */
async function menuProblems(cdp: Cdp): Promise<string[]> {
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: PHONE,
    height: VIEWPORT_HEIGHT,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await cdp.send("Page.navigate", { url: `${origin}/docs` });
  await evaluate(cdp, SETTLE);
  await sleep(SETTLE_MS);
  const steps = [
    ["Escape", `document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }))`, "/docs"],
    [
      "a press outside",
      `document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }))`,
      "/docs",
    ],
    [
      "a link",
      `document.querySelector('nav[aria-label="Site"] details a[href="/changelog"]').click()`,
      "/changelog",
    ],
  ] as const;
  const problems: string[] = [];
  for (const [what, action, path] of steps) {
    await evaluate(cdp, OPEN_MENU);
    const opened = await evaluate(cdp, MENU_STATE);
    await evaluate(cdp, action);
    await sleep(SETTLE_MS);
    const after = await evaluate(cdp, MENU_STATE);
    if (
      JSON.stringify(opened) !== JSON.stringify([true, path === "/changelog" ? "/docs" : path]) ||
      JSON.stringify(after) !== JSON.stringify([false, path])
    ) {
      problems.push(
        `The phone menu doesn't close on ${what}: open ${JSON.stringify(opened)}, then ${JSON.stringify(after)}`,
      );
    }
  }
  return problems;
}

let port: string | undefined;

/** Ends the run on Ctrl-C, a signal or a hang, after the same cleanup as a normal end. */
function stop(reason: string): void {
  console.error(reason);
  // oxlint-disable-next-line typescript/no-floating-promises -- a signal handler or timer has no caller to await; it exits once cleanup is done
  cleanUp(port).finally(() => process.exit(EXIT_INTERRUPTED));
}
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"] as const) {
  process.once(signal, () => stop(`Stopped by ${signal}.`));
}
const hung = setTimeout(
  () => stop(`Gave up after ${RUN_TIMEOUT_MS / MS_PER_SECOND} s.`),
  RUN_TIMEOUT_MS,
);
const [, error] = await tryCatch(async () => {
  port = await devToolsPort();
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
      if (MISSING.includes(path)) {
        const shown = await evaluate(
          cdp,
          `[document.querySelectorAll('nav[aria-label="Site"]').length, (document.body.innerText.match(/This page flew off\\./g) ?? []).length, document.body.innerText.includes("Something went wrong")]`,
        );
        if (JSON.stringify(shown) !== "[1,1,false]") {
          failures.push(
            `${path} at ${width} px: expected one site nav and one not-found heading, got ${JSON.stringify(shown)}`,
          );
        }
      }
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
  failures.push(...(await menuProblems(cdp)));
  cdp.close();
});
clearTimeout(hung);
await cleanUp(port);
if (error !== null) {
  console.error(errorText(error));
  process.exit(1);
}
console.log(`${PAGES.length * WIDTHS.length} screenshots in ${out}`);
if (failures.length > 0) {
  console.error(failures.join("\n"));
  process.exit(1);
}
