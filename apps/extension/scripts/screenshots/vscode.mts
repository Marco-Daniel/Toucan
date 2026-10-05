// Driving VS Code for the README screenshot script: a window's page (keys,
// commands, waits, captures) and the main process (window size and focus).
// import utils
import { decodePng } from "./images.mts";
import { waitFor } from "./wait.mts";
import { isRecord } from "../../src/shared/records/records.util.ts";

// import types
import type { DevToolsSession, FunctionCall } from "./cdp.mts";
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

// Page and main-process code is fixed function source: whatever varies goes in
// as an argument (FunctionCall), never spliced into the text.

const QUICK_INPUT_OPEN = `function () {
  const w = document.querySelector(".quick-input-widget");
  return (w && w.style.display !== "none" && w.offsetHeight > 0) || undefined;
}`;

/** Holds once a Toucan picker with the title (argument) is open. */
export const PICKER_TITLED = `function (title) {
  const w = document.querySelector(".quick-input-widget");
  return (w && w.offsetHeight > 0 && w.querySelector(".quick-input-title")?.textContent === title) || undefined;
}`;

/** The focused picker row's label starts with (`"start"`) or includes (`"include"`) the text. */
const FOCUSED_ROW_HAS = `function (how, text) {
  const label = document.querySelector(".quick-input-widget .monaco-list-row.focused")?.getAttribute("aria-label") ?? "";
  return (how === "start" ? label.startsWith(text) : label.includes(text)) || undefined;
}`;

/** Holds once the active tab is the file (argument). */
export const TAB_ACTIVE = `function (file) {
  return [...document.querySelectorAll(".tab.active")].some((tab) => tab.getAttribute("aria-label")?.startsWith(file)) || undefined;
}`;

/** An element's box, once it has a width. */
const BOX = `function (selector) {
  const r = document.querySelector(selector)?.getBoundingClientRect();
  return r && r.width > 0 ? { x: r.x, y: r.y, width: r.width, height: r.height } : undefined;
}`;

/** The body of the primary sidebar section titled (argument), once it has a width. */
const SECTION_BODY_BOX = `function (title) {
  const header = [...document.querySelectorAll(".part.sidebar .pane-header")].find((e) => e.textContent.trim() === title);
  const r = header?.parentElement?.querySelector(".pane-body")?.getBoundingClientRect();
  return r && r.width > 0 && r.height > 0 ? { x: r.x, y: r.y, width: r.width, height: r.height } : undefined;
}`;

const COMMAND_CENTER_COLOR = `function () {
  return [...document.querySelectorAll(".command-center *")].map((e) => getComputedStyle(e).backgroundColor).find((c) => c !== "rgba(0, 0, 0, 0)");
}`;

const DEVICE_PIXEL_RATIO = `function () {
  return devicePixelRatio;
}`;

export const TOUCAN_ITEM = `[id="marco-daniel.toucan.toucan.indicator"]`;
/** The Toucan status bar item's label (e.g. "Toucan: webshop, Canopy Teal heart"), from its selector. */
export const TOUCAN_LABEL = `function (selector) {
  return document.querySelector(selector)?.getAttribute("aria-label") ?? undefined;
}`;
/** Holds once the Toucan item's label (selector) differs from the one before. */
export const TOUCAN_LABEL_CHANGED = `function (selector, before) {
  return (document.querySelector(selector)?.getAttribute("aria-label") ?? undefined) !== before || undefined;
}`;

/** Sizes every window and cascades them; `this` is the electron module. */
const SIZE_WINDOWS = `function (size, cascade) {
  this.BrowserWindow.getAllWindows().forEach((w, i) => {
    w.setContentSize(size.width, size.height);
    w.setPosition(cascade.left + i * cascade.stepX, cascade.top + i * cascade.stepY);
  });
}`;

/** Focuses the window whose title names the folder; `this` is the electron module. */
const FOCUS_WINDOW = `function (separator, name) {
  const { app, BrowserWindow } = this;
  const w = BrowserWindow.getAllWindows().find((w) => w.getTitle().split(separator).includes(name));
  if (!w) return false;
  app.focus({ steal: true });
  w.focus();
  return w.isFocused();
}`;

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
  /** Page code; a result of `undefined` or `null` means "not yet". */
  call: FunctionCall;
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

  /** The function's result in the page. */
  async call(call: FunctionCall): Promise<unknown> {
    return this.page.call(call);
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
    await this.waitFor({ what: "the Command Palette", call: { fn: QUICK_INPUT_OPEN } });
    await this.type(title);
    await this.waitFor({
      what: `"${title}" in the Command Palette`,
      call: { fn: FOCUSED_ROW_HAS, args: ["start", title] },
    });
    await this.key({ key: "Enter" });
  }

  /** Opens a file by name with Quick Open, and waits for its tab. */
  async open(file: string): Promise<void> {
    await this.key({ key: "p", modifiers: MODIFIERS.meta });
    await this.waitFor({ what: "Quick Open", call: { fn: QUICK_INPUT_OPEN } });
    await this.type(file);
    await this.waitFor({
      what: `${file} in Quick Open`,
      call: { fn: FOCUSED_ROW_HAS, args: ["include", file] },
    });
    await this.key({ key: "Enter" });
    await this.waitFor({ what: `the ${file} tab`, call: { fn: TAB_ACTIVE, args: [file] } });
  }

  /** The call's first defined value in the page. */
  async waitFor({ what, call }: WaitArgs): Promise<unknown> {
    return waitFor({
      what: `${what} in ${this.name}`,
      check: async () => (await this.call(call)) ?? undefined,
      timeoutMs: STEP_TIMEOUT_MS,
    });
  }

  /** The Command Center's background as the page renders it, if it has one. */
  async commandCenterColor(): Promise<string | undefined> {
    const value = await this.call({ fn: COMMAND_CENTER_COLOR });
    return typeof value === "string" ? value : undefined;
  }

  /** The page, or a part of it, as an image. */
  async capture({ clip, scale }: CaptureArgs): Promise<Image> {
    const area = clip ?? { x: 0, y: 0, ...WINDOW };
    const ratio = await this.call({ fn: DEVICE_PIXEL_RATIO });
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

  /** The body of the primary sidebar section with this title, once it's on screen and expanded. */
  async sectionBody(title: string): Promise<Rect> {
    const value = await this.waitFor({
      what: `the ${title} section`,
      call: { fn: SECTION_BODY_BOX, args: [title] },
    });
    if (!isRect(value)) {
      throw new Error(`No box for the ${title} section`);
    }
    return value;
  }

  /** An element's box, once it's on screen. */
  async box(selector: string): Promise<Rect> {
    const value = await this.waitFor({ what: selector, call: { fn: BOX, args: [selector] } });
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

/** The main process's electron module, the `this` of its calls. */
const ELECTRON = `require("electron")`;

/** VS Code's main process, through --inspect: window size and focus. */
export class Main {
  private readonly session: DevToolsSession;

  constructor(session: DevToolsSession) {
    this.session = session;
  }

  async sizeWindows(): Promise<void> {
    await this.session.call({ fn: SIZE_WINDOWS, args: [WINDOW, CASCADE], on: ELECTRON });
  }

  /** Brings the window with this folder to the front; `true` once it has focus. */
  async focus(name: string): Promise<boolean> {
    const value = await this.session.call({
      fn: FOCUS_WINDOW,
      args: [TITLE_SEPARATOR, name],
      on: ELECTRON,
    });
    return value === true;
  }
}

/** Whether a window title names this folder. */
export function titleNames({ title, name }: { title: string; name: string }): boolean {
  return title.split(TITLE_SEPARATOR).includes(name);
}
