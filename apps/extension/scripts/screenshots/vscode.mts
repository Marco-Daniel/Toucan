// Driving VS Code for the README screenshot script: a window's page (keys,
// commands, waits, captures) and the main process (window size and focus).
// import utils
import { decodePng } from "./images.mts";
import { waitFor } from "./wait.mts";
import { isRecord } from "../../src/shared/records/records.util.ts";

// import types
import type { DevToolsSession } from "./cdp.mts";
import type { Rect } from "./geometry.mts";
import type { Image } from "./images.mts";

/** Each window's content size, in CSS pixels. */
export const WINDOW = { width: 1100, height: 660 } as const;
/** The longest any single step may take. */
export const STEP_TIMEOUT_MS = 20_000;

const KEY_CODES: Record<string, number> = { Enter: 13, Escape: 27, ArrowDown: 40, ArrowUp: 38 };
/** DevTools' modifier bits. */
export const MODIFIERS = { meta: 4, shift: 8 } as const;
/** Windows cascade from here, each this far from the last. */
const CASCADE = { left: 40, top: 40, stepX: 60, stepY: 40 } as const;
/** VS Code's window title separator. */
const TITLE_SEPARATOR = " — ";

const QUICK_INPUT_OPEN = `(() => { const w = document.querySelector(".quick-input-widget"); return w && w.style.display !== "none" && w.offsetHeight > 0 || undefined; })()`;

/** An expression that holds once a Toucan picker with this title is open. */
export function pickerTitle(title: string): string {
  return `(() => { const w = document.querySelector(".quick-input-widget"); return w && w.offsetHeight > 0 && w.querySelector(".quick-input-title")?.textContent === ${JSON.stringify(title)} || undefined; })()`;
}

export const TOUCAN_ITEM = `[id="marco-daniel.toucan.toucan.indicator"]`;
/** The Toucan status bar item's label, e.g. "Toucan: webshop, Canopy Teal heart". */
export const TOUCAN_LABEL = `document.querySelector('${TOUCAN_ITEM}')?.getAttribute("aria-label") ?? undefined`;

interface WindowArgs {
  name: string;
  page: DevToolsSession;
}

interface KeyArgs {
  key: string;
  modifiers?: number;
}

interface PointArgs {
  x: number;
  y: number;
}

interface WaitArgs {
  what: string;
  /** Page JavaScript; `undefined` or `null` means "not yet". */
  expression: string;
}

interface CaptureArgs {
  clip?: Rect;
  /** Image pixels per CSS pixel. */
  scale: number;
}

/** A VS Code window's page, driven over DevTools. */
export class Window {
  readonly name: string;
  private readonly page: DevToolsSession;

  constructor({ name, page }: WindowArgs) {
    this.name = name;
    this.page = page;
  }

  async evaluate(expression: string): Promise<unknown> {
    return this.page.evaluate(expression);
  }

  async key({ key, modifiers = 0 }: KeyArgs): Promise<void> {
    const code = KEY_CODES[key] ?? key.toUpperCase().charCodeAt(0);
    const event = {
      key,
      code: key in KEY_CODES ? key : `Key${key.toUpperCase()}`,
      windowsVirtualKeyCode: code,
      nativeVirtualKeyCode: code,
      modifiers,
    };
    await this.page.send("Input.dispatchKeyEvent", { type: "rawKeyDown", ...event });
    await this.page.send("Input.dispatchKeyEvent", { type: "keyUp", ...event });
  }

  async type(text: string): Promise<void> {
    await this.page.send("Input.insertText", { text });
  }

  async hover({ x, y }: PointArgs): Promise<void> {
    await this.page.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
  }

  /** Runs a command by its palette title, once the palette has it on top. */
  async run(title: string): Promise<void> {
    await this.key({ key: "p", modifiers: MODIFIERS.meta | MODIFIERS.shift });
    await this.waitFor({ what: "the Command Palette", expression: QUICK_INPUT_OPEN });
    await this.type(title);
    await this.waitFor({
      what: `"${title}" in the Command Palette`,
      expression: `document.querySelector(".quick-input-widget .monaco-list-row.focused")?.getAttribute("aria-label")?.startsWith(${JSON.stringify(title)}) || undefined`,
    });
    await this.key({ key: "Enter" });
  }

  /** Opens a file by name with Quick Open, and waits for its tab. */
  async open(file: string): Promise<void> {
    await this.key({ key: "p", modifiers: MODIFIERS.meta });
    await this.waitFor({ what: "Quick Open", expression: QUICK_INPUT_OPEN });
    await this.type(file);
    await this.waitFor({
      what: `${file} in Quick Open`,
      expression: `document.querySelector(".quick-input-widget .monaco-list-row.focused")?.getAttribute("aria-label")?.includes(${JSON.stringify(file)}) || undefined`,
    });
    await this.key({ key: "Enter" });
    await this.waitFor({
      what: `the ${file} tab`,
      expression: `[...document.querySelectorAll(".tab.active")].some((tab) => tab.getAttribute("aria-label")?.startsWith(${JSON.stringify(file)})) || undefined`,
    });
  }

  /** The expression's first defined value in the page. */
  async waitFor({ what, expression }: WaitArgs): Promise<unknown> {
    return waitFor({
      what: `${what} in ${this.name}`,
      check: async () =>
        this.evaluate(
          `(() => { const v = (${expression}); return v === null ? undefined : v; })()`,
        ),
      timeoutMs: STEP_TIMEOUT_MS,
    });
  }

  /** The Command Center's background as the page renders it, if it has one. */
  async commandCenterColor(): Promise<string | undefined> {
    const value = await this.evaluate(
      `[...document.querySelectorAll(".command-center *")].map((e) => getComputedStyle(e).backgroundColor).find((c) => c !== "rgba(0, 0, 0, 0)")`,
    );
    return typeof value === "string" ? value : undefined;
  }

  /** The page, or a part of it, as an image. */
  async capture({ clip, scale }: CaptureArgs): Promise<Image> {
    const area = clip ?? { x: 0, y: 0, ...WINDOW };
    const ratio = await this.evaluate("devicePixelRatio");
    const reply = await this.page.send("Page.captureScreenshot", {
      format: "png",
      // DevTools scales in device pixels, so divide out the screen's own ratio.
      clip: { ...area, scale: scale / (typeof ratio === "number" && ratio > 0 ? ratio : 1) },
    });
    if (!isRecord(reply) || typeof reply["data"] !== "string") {
      throw new Error(`No screenshot of ${this.name}`);
    }
    return decodePng(Buffer.from(reply["data"], "base64"));
  }

  /** An element's box, once it's on screen. */
  async box(selector: string): Promise<Rect> {
    const value = await this.waitFor({
      what: selector,
      expression: `(() => { const r = document.querySelector(${JSON.stringify(selector)})?.getBoundingClientRect(); return r && r.width > 0 ? { x: r.x, y: r.y, width: r.width, height: r.height } : undefined; })()`,
    });
    if (!isRect(value)) {
      throw new Error(`No box for ${selector}`);
    }
    return value;
  }
}

function isRect(value: unknown): value is Rect {
  return (
    isRecord(value) &&
    typeof value["x"] === "number" &&
    typeof value["y"] === "number" &&
    typeof value["width"] === "number" &&
    typeof value["height"] === "number"
  );
}

/** VS Code's main process, through --inspect: window size and focus. */
export class Main {
  private readonly session: DevToolsSession;

  constructor(session: DevToolsSession) {
    this.session = session;
  }

  async sizeWindows(): Promise<void> {
    await this.session.evaluate(
      `require("electron").BrowserWindow.getAllWindows().forEach((w, i) => { w.setContentSize(${WINDOW.width}, ${WINDOW.height}); w.setPosition(${CASCADE.left} + i * ${CASCADE.stepX}, ${CASCADE.top} + i * ${CASCADE.stepY}); })`,
    );
  }

  /** Brings the window with this folder to the front; `true` once it has focus. */
  async focus(name: string): Promise<boolean> {
    const value = await this.session.evaluate(
      `(() => { const { app, BrowserWindow } = require("electron"); const w = BrowserWindow.getAllWindows().find((w) => w.getTitle().split(${JSON.stringify(TITLE_SEPARATOR)}).includes(${JSON.stringify(name)})); if (!w) return false; app.focus({ steal: true }); w.focus(); return w.isFocused(); })()`,
    );
    return value === true;
  }
}

/** Whether a window title names this folder. */
export function titleNames({ title, name }: { title: string; name: string }): boolean {
  return title.split(TITLE_SEPARATOR).includes(name);
}
