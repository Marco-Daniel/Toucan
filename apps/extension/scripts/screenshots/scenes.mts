// What the README screenshot script records: the hero GIF (focus moving
// across three windows, then Set Color's live preview) and one still per
// feature.
// import libraries
import { mkdirSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

// import utils
import { REPOS } from "./fixture.mts";
import { around, rgb } from "./geometry.mts";
import { colorShare, dominantColor, encodeGif, encodePng, stacked } from "./images.mts";
import { baseSettings, writeSettings } from "./session.mts";
import {
  MODIFIERS,
  PICKER_TITLED,
  STEP_TIMEOUT_MS,
  TAB_ACTIVE,
  TOUCAN_ITEM,
  TOUCAN_LABEL,
  TOUCAN_LABEL_CHANGED,
  WINDOW,
} from "./vscode.mts";
import { waitFor } from "./wait.mts";

// import types
import type { Rect } from "./geometry.mts";
import type { Image, Rgba } from "./images.mts";
import type { Paths, Session } from "./session.mts";
import type { Window } from "./vscode.mts";

/** Whether the title bar's inactive (dim) look matches the argument. */
const TITLE_BAR_INACTIVE = `function (inactive) {
  return document.querySelector(".part.titlebar")?.classList.contains("inactive") === inactive;
}`;
const DIALOG_OPEN = `function () {
  return document.querySelector(".monaco-dialog-box") !== null;
}`;
/** Clicks the open dialog's button with this text. */
const CLICK_DIALOG_BUTTON = `function (text) {
  [...document.querySelectorAll(".monaco-dialog-box .monaco-button")].find((b) => b.textContent.trim() === text)?.click();
}`;
const EMOJI_IN_COMMAND_CENTER = `function () {
  return /^\\p{Extended_Pictographic}/u.test(document.querySelector(".command-center")?.innerText ?? "") || undefined;
}`;

/** The hero shows each window's bars at this scale: 880 pixels wide, the README's column. */
const HERO_SCALE = 0.8;
/** Between two windows' strips, and between a window's title bar and status bar. */
const HERO_GAP = 14;
const BAR_GAP = 3;
/** Checks for settled or colored pixels look at a small capture. */
const SAMPLE_SCALE = 0.4;
const HERO_GREY = 24;
const OPAQUE = 255;
const HERO_BACKGROUND: Rgba = [HERO_GREY, HERO_GREY, HERO_GREY, OPAQUE];
const HOLD_MS = 1400;
const PREVIEW_MS = 650;
/** The last frame, with the saved color, stays longer. */
const FINAL_HOLD_MS = 2800;
/** Colors Set Color previews in the hero; it saves the last one. */
const HERO_PREVIEWS = ["#e0620b", "#56915e"] as const;
/** The color Set Color previews in its still. */
const STILL_PREVIEW = "#e0620b";

/** Full-window stills, scaled down to keep the files small. */
const STILL_SCALE = 0.75;
/** Close-ups of a small area, at a high-resolution screen's sharpness. */
const CLOSE_UP_SCALE = 2;
const MARGIN = 8;
/** The middle of a box: half its size in from its start. */
const HALF = 2;

function half(size: number): number {
  return size / HALF;
}

/** How far a captured channel may be from the reference (scaling blends edges). */
const COLOR_TOLERANCE = 6;
/**
 * The sidebar stills, and the share of the bar in the repository color that
 * tells their styles apart: full style fills it, muted style only colors the
 * glyph.
 */
const SIDEBAR_STILLS = [
  { style: "full", name: "sidebar-block", share: { min: 0.6, max: 1 } },
  { style: "muted", name: "sidebar-muted", share: { min: 0.005, max: 0.2 } },
] as const;

/**
 * The repository color as this screen's captures render it: the Command
 * Center's most frequent color, its background. Captures are color-managed, so the CSS value
 * itself would be a few steps off on most displays.
 */
async function commandCenterPixel(window: Window): Promise<Rgba> {
  const box = await window.box(".command-center");
  return dominantColor(await window.capture({ clip: box, scale: SAMPLE_SCALE }));
}

/** The window the stills show. */
const STILL_REPO = "webshop";

interface FocusArgs {
  session: Session;
  name: string;
  /** The color the Command Centers should show, if not the repo's own. */
  color?: string;
}

/**
 * Focuses the window and waits until every window's Command Center renders
 * its color: the color is a user setting, so all windows show the focused
 * one's (dimmed where unfocused), while each status bar keeps its own.
 */
async function focusUntilColored({ session, name, color }: FocusArgs): Promise<void> {
  const repo = REPOS.find((candidate) => candidate.name === name);
  const expected = rgb(color ?? repo?.background ?? "");
  for (const window of session.all()) {
    await waitFor({
      what: `${window.name}'s Command Center in ${name}'s color`,
      check: async () => {
        // Another app can take focus back; ask again each time.
        await session.main.focus(name);
        return (await window.commandCenterColor()) === expected || undefined;
      },
      timeoutMs: STEP_TIMEOUT_MS,
    });
  }
  await titleBarsSettled({ session, name });
}

/** Waits until VS Code marks only this window's title bar active (bright), the others inactive (dim). */
async function titleBarsSettled({ session, name }: FocusArgs): Promise<void> {
  for (const window of session.all()) {
    const inactive = window.name !== name;
    await waitFor({
      what: `${window.name}'s title bar to look ${inactive ? "inactive" : "active"}`,
      check: async () => {
        await session.main.focus(name);
        return (
          (await window.call({ fn: TITLE_BAR_INACTIVE, args: [inactive] })) === true || undefined
        );
      },
      timeoutMs: STEP_TIMEOUT_MS,
    });
  }
}

/**
 * One GIF frame: each window as a strip of its title bar above its status
 * bar, the three strips stacked. Small enough for the README's column, and
 * it shows where the colors are without the editors in between.
 */
async function heroFrame(session: Session): Promise<Image> {
  const strips = [];
  for (const window of session.all()) {
    const bars = [];
    for (const part of [".part.titlebar", ".part.statusbar"]) {
      bars.push(await window.capture({ clip: await window.box(part), scale: HERO_SCALE }));
    }
    strips.push(stacked({ images: bars, gap: BAR_GAP, background: HERO_BACKGROUND }));
  }
  return stacked({ images: strips, gap: HERO_GAP, background: HERO_BACKGROUND });
}

interface PreviewArgs {
  window: Window;
  color: string;
}

/** Types a color into the open Set Color input and waits for the status bar to show it. */
async function preview({ window, color }: PreviewArgs): Promise<void> {
  const before = await window.call({ fn: TOUCAN_LABEL, args: [TOUCAN_ITEM] });
  await window.key({ key: "a", modifiers: MODIFIERS.meta });
  await window.type(color);
  await window.waitFor({
    what: `the ${color} preview`,
    call: { fn: TOUCAN_LABEL_CHANGED, args: [TOUCAN_ITEM, before] },
  });
}

interface RecordHeroArgs {
  session: Session;
  /** Where the GIF goes. */
  out: string;
  /** Where to also write each frame as a PNG, for reviewing the GIF. */
  framesDir: string | undefined;
}

export async function recordHero({ session, out, framesDir }: RecordHeroArgs): Promise<void> {
  // Each window opened its demo file at launch: DevTools key input would mark
  // a page focused for good, and its Command Center would never look inactive.
  for (const { name, open } of REPOS) {
    const file = basename(open);
    await session
      .window(name)
      .waitFor({ what: `the ${file} tab`, call: { fn: TAB_ACTIVE, args: [file] } });
  }
  const frames = [];
  for (const { name } of REPOS) {
    await focusUntilColored({ session, name });
    frames.push({ image: await heroFrame(session), delayMs: HOLD_MS });
  }
  const [last] = REPOS.slice(-1);
  const name = last?.name ?? "";
  const window = session.window(name);
  await window.run("Toucan: Set Color for This Repo");
  await window.waitFor({
    what: "the Set Color input",
    call: { fn: PICKER_TITLED, args: [`Toucan: Color for ${name}`] },
  });
  for (const color of HERO_PREVIEWS) {
    await preview({ window, color });
    frames.push({ image: await heroFrame(session), delayMs: PREVIEW_MS });
  }
  await window.key({ key: "Enter" });
  await focusUntilColored({ session, name, color: HERO_PREVIEWS.at(-1) ?? "" });
  frames.push({ image: await heroFrame(session), delayMs: FINAL_HOLD_MS });
  writeFileSync(join(out, "hero.gif"), encodeGif(frames));
  console.log(`  media/readme/hero.gif ${frames.length} frames`);
  if (framesDir !== undefined) {
    mkdirSync(framesDir, { recursive: true });
    frames.forEach(({ image }, index) => {
      writeFileSync(join(framesDir, `hero-${index + 1}.png`), encodePng(image));
    });
  }
}

function save({ out, name, image }: { out: string; name: string; image: Image }): void {
  writeFileSync(join(out, `${name}.png`), encodePng(image));
  console.log(`  media/readme/${name}.png ${image.width}×${image.height}`);
}

interface SettledPixelsArgs {
  window: Window;
  clip?: Rect;
}

/** Waits until two captures in a row are the same, e.g. after a fade or a webview's render. */
async function settledPixels({ window, clip }: SettledPixelsArgs): Promise<void> {
  let last = "";
  await waitFor({
    what: `${window.name} to stop changing`,
    check: async () => {
      const image = await window.capture({ ...(clip ? { clip } : {}), scale: SAMPLE_SCALE });
      const now = Buffer.from(image.data).toString("base64");
      const same = now === last;
      last = now;
      return same || undefined;
    },
    timeoutMs: STEP_TIMEOUT_MS,
  });
}

/** The title bar, sharp, for the Command Center close-ups. */
async function titleBar(window: Window): Promise<Image> {
  return window.capture({ clip: await window.box(".part.titlebar"), scale: CLOSE_UP_SCALE });
}

async function statusBarHover(window: Window): Promise<Image> {
  const item = await window.box(TOUCAN_ITEM);
  await window.hover({ x: item.x + half(item.width), y: item.y + half(item.height) });
  const hover = await window.box(".workbench-hover-container, .monaco-hover");
  const clip = around({
    boxes: [hover, item, await window.box(".part.statusbar")],
    margin: MARGIN,
    bounds: WINDOW,
  });
  // The hover fades in; capture once it's fully drawn.
  await settledPixels({ window, clip });
  const image = await window.capture({ clip, scale: CLOSE_UP_SCALE });
  await window.hover({ x: half(WINDOW.width), y: half(WINDOW.height) });
  return image;
}

interface PickerStillArgs {
  window: Window;
  command: string;
  /** The picker's title word: "Preset" for "Toucan: Preset for webshop". */
  title: string;
  /** The row to preview, e.g. "Lilac"; the picker moves up to it from the current one. */
  row: string;
}

/** The highlighted row's label in an open picker. */
const FOCUSED_ROW = `function () {
  return document.querySelector(".quick-input-widget .monaco-list-row.focused")?.getAttribute("aria-label") ?? "";
}`;
/** More rows than any Toucan picker has. */
const MAX_ROWS = 40;

async function pickerStill({ window, command, title, row }: PickerStillArgs): Promise<Image> {
  await window.run(command);
  await window.waitFor({
    what: command,
    call: { fn: PICKER_TITLED, args: [`Toucan: ${title} for ${window.name}`] },
  });
  const label = await window.call({ fn: TOUCAN_LABEL, args: [TOUCAN_ITEM] });
  const isRow = async () => String(await window.call({ fn: FOCUSED_ROW })).startsWith(row);
  for (let step = 0; step < MAX_ROWS && !(await isRow()); step++) {
    await window.key({ key: "ArrowUp" });
  }
  if (!(await isRow())) {
    throw new Error(`No "${row}" row in ${command}`);
  }
  await window.waitFor({
    what: `${command}'s preview`,
    call: { fn: TOUCAN_LABEL_CHANGED, args: [TOUCAN_ITEM, label] },
  });
  // The picker fades in; capture once it's fully drawn.
  await settledPixels({ window });
  const image = await window.capture({ scale: STILL_SCALE });
  await window.key({ key: "Escape" });
  return image;
}

interface CaptureStillsArgs {
  session: Session;
  paths: Paths;
}

export async function captureStills({ session, paths }: CaptureStillsArgs): Promise<void> {
  const window = session.window(STILL_REPO);
  await focusUntilColored({ session, name: STILL_REPO });
  save({ out: paths.staging, name: "command-center", image: await titleBar(window) });
  save({ out: paths.staging, name: "status-bar", image: await statusBarHover(window) });

  await window.run("Toucan: Set Color for This Repo");
  await window.waitFor({
    what: "the Set Color input",
    call: { fn: PICKER_TITLED, args: [`Toucan: Color for ${STILL_REPO}`] },
  });
  await preview({ window, color: STILL_PREVIEW });
  save({
    out: paths.staging,
    name: "set-color",
    image: await window.capture({ scale: STILL_SCALE }),
  });
  await window.key({ key: "Escape" });

  save({
    out: paths.staging,
    name: "preset-color",
    image: await pickerStill({
      window,
      command: "Toucan: Pick Preset Color",
      title: "Preset",
      row: "Lilac",
    }),
  });
  save({
    out: paths.staging,
    name: "set-glyph",
    image: await pickerStill({
      window,
      command: "Toucan: Set Glyph",
      title: "Glyph",
      row: "toucan",
    }),
  });

  await window.run("Toucan: Clear Color");
  await window.box(".monaco-dialog-box");
  save({
    out: paths.staging,
    name: "clear-color",
    image: await window.capture({ scale: STILL_SCALE }),
  });
  await window.key({ key: "Escape" });

  const sidebarStills: Image[] = [];
  for (const { style, name, share } of SIDEBAR_STILLS) {
    writeSettings({
      paths,
      settings: {
        ...baseSettings(),
        "toucan.sidebarBlock.enabled": true,
        "toucan.sidebarBlock.style": style,
      },
    });
    await focusUntilColored({ session, name: STILL_REPO });
    // The block is a webview, drawn in an overlay above the bar rather than
    // inside it. Wait until the bar shows this style: in full style the
    // repository color fills most of it, in muted style only the glyph has it.
    // The previous style's block stays on screen until the new one renders.
    const bar = await window.box(".part.auxiliarybar");
    const color = await commandCenterPixel(window);
    await waitFor({
      what: `the ${style} sidebar block`,
      check: async () => {
        const image = await window.capture({ clip: bar, scale: SAMPLE_SCALE });
        const part = colorShare({ image, color, tolerance: COLOR_TOLERANCE });
        return (part >= share.min && part <= share.max) || undefined;
      },
      timeoutMs: STEP_TIMEOUT_MS,
    });
    await settledPixels({ window, clip: bar });
    const image = await window.capture({ scale: STILL_SCALE });
    sidebarStills.push(image);
    save({ out: paths.staging, name, image });
  }
  const [full, muted] = sidebarStills;
  if (full && muted && Buffer.from(full.data).equals(Buffer.from(muted.data))) {
    throw new Error("The full and muted sidebar stills are the same image");
  }

  writeSettings({
    paths,
    settings: { ...baseSettings(), "toucan.experimental.searchEmoji": true },
  });
  await waitFor({
    what: "the search emoji's consent dialog",
    check: async () => {
      await session.main.focus(STILL_REPO);
      return (await window.call({ fn: DIALOG_OPEN })) === true || undefined;
    },
    timeoutMs: STEP_TIMEOUT_MS,
  });
  await window.call({ fn: CLICK_DIALOG_BUTTON, args: ["Change Window Title"] });
  await window.open("README.md");
  await window.waitFor({
    what: "the emoji in the Command Center",
    call: { fn: EMOJI_IN_COMMAND_CENTER },
  });
  // The title settles a moment after the emoji appears (the file name follows).
  await settledPixels({ window, clip: await window.box(".part.titlebar") });
  save({ out: paths.staging, name: "search-emoji", image: await titleBar(window) });
}

/** What every window showed when the run failed, to see why. */
export async function captureFailure({
  session,
  dir,
}: {
  session: Session;
  dir: string;
}): Promise<void> {
  mkdirSync(dir, { recursive: true });
  for (const window of session.all()) {
    writeFileSync(
      join(dir, `failure-${window.name}.png`),
      encodePng(await window.capture({ scale: STILL_SCALE })),
    );
  }
}
