// What the README screenshot script records: the hero GIF (focus moving
// across three windows, then Set Color's live preview) and one still per
// feature.
// import libraries
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// import utils
import { REPOS } from "./fixture.mts";
import { around, rgb } from "./geometry.mts";
import { encodeGif, encodePng, sideBySide } from "./images.mts";
import { baseSettings, writeSettings } from "./session.mts";
import {
  MODIFIERS,
  pickerTitle,
  STEP_TIMEOUT_MS,
  TOUCAN_ITEM,
  TOUCAN_LABEL,
  WINDOW,
} from "./vscode.mts";
import { waitFor } from "./wait.mts";

// import types
import type { Rect } from "./geometry.mts";
import type { Image, Rgba } from "./images.mts";
import type { Paths, Session } from "./session.mts";
import type { Window } from "./vscode.mts";

/** The hero GIF shows each window at this fraction of its size. */
const HERO_SCALE = 0.42;
const HERO_GAP = 12;
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

/** The window the stills show. */
const STILL_REPO = "webshop";

/** Where the README's images go. */
export const OUT = join(import.meta.dirname, "..", "..", "media", "readme");

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
}

/** The three windows side by side, scaled down, as one GIF frame. */
async function heroFrame(session: Session): Promise<Image> {
  const images = await Promise.all(
    session.all().map(async (window) => window.capture({ scale: HERO_SCALE })),
  );
  return sideBySide({ images, gap: HERO_GAP, background: HERO_BACKGROUND });
}

interface PreviewArgs {
  window: Window;
  color: string;
}

/** Types a color into the open Set Color input and waits for the status bar to show it. */
async function preview({ window, color }: PreviewArgs): Promise<void> {
  const before = await window.evaluate(TOUCAN_LABEL);
  await window.key({ key: "a", modifiers: MODIFIERS.meta });
  await window.type(color);
  await window.waitFor({
    what: `the ${color} preview`,
    expression: `(${TOUCAN_LABEL}) !== ${JSON.stringify(before)} || undefined`,
  });
}

interface RecordHeroArgs {
  session: Session;
  /** Where to also write each frame as a PNG, for reviewing the GIF. */
  framesDir: string | undefined;
}

export async function recordHero({ session, framesDir }: RecordHeroArgs): Promise<void> {
  for (const { name, open } of REPOS) {
    await session.window(name).open(open);
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
    expression: pickerTitle(`Toucan: Color for ${name}`),
  });
  for (const color of HERO_PREVIEWS) {
    await preview({ window, color });
    frames.push({ image: await heroFrame(session), delayMs: PREVIEW_MS });
  }
  await window.key({ key: "Enter" });
  await focusUntilColored({ session, name, color: HERO_PREVIEWS.at(-1) ?? "" });
  frames.push({ image: await heroFrame(session), delayMs: FINAL_HOLD_MS });
  writeFileSync(join(OUT, "hero.gif"), encodeGif(frames));
  console.log(`  media/readme/hero.gif ${frames.length} frames`);
  if (framesDir !== undefined) {
    mkdirSync(framesDir, { recursive: true });
    frames.forEach(({ image }, index) => {
      writeFileSync(join(framesDir, `hero-${index + 1}.png`), encodePng(image));
    });
  }
}

function save({ name, image }: { name: string; image: Image }): void {
  writeFileSync(join(OUT, `${name}.png`), encodePng(image));
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
      const image = await window.capture({ ...(clip ? { clip } : {}), scale: HERO_SCALE });
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
  /** How many rows up from the current one to preview. */
  stepsUp: number;
}

async function pickerStill({ window, command, title, stepsUp }: PickerStillArgs): Promise<Image> {
  await window.run(command);
  await window.waitFor({
    what: command,
    expression: pickerTitle(`Toucan: ${title} for ${window.name}`),
  });
  const label = await window.evaluate(TOUCAN_LABEL);
  for (let step = 0; step < stepsUp; step++) {
    await window.key({ key: "ArrowUp" });
  }
  await window.waitFor({
    what: `${command}'s preview`,
    expression: `(${TOUCAN_LABEL}) !== ${JSON.stringify(label)} || undefined`,
  });
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
  save({ name: "command-center", image: await titleBar(window) });
  save({ name: "status-bar", image: await statusBarHover(window) });

  await window.run("Toucan: Set Color for This Repo");
  await window.waitFor({
    what: "the Set Color input",
    expression: pickerTitle(`Toucan: Color for ${STILL_REPO}`),
  });
  await preview({ window, color: STILL_PREVIEW });
  save({ name: "set-color", image: await window.capture({ scale: STILL_SCALE }) });
  await window.key({ key: "Escape" });

  // From the current Tropical Pink up to Lilac, and from the current heart up to the toucan.
  const LILAC = 2;
  const TOUCAN = 10;
  save({
    name: "preset-color",
    image: await pickerStill({
      window,
      command: "Toucan: Pick Preset Color",
      title: "Preset",
      stepsUp: LILAC,
    }),
  });
  save({
    name: "set-glyph",
    image: await pickerStill({
      window,
      command: "Toucan: Set Glyph",
      title: "Glyph",
      stepsUp: TOUCAN,
    }),
  });

  await window.run("Toucan: Clear Color");
  await window.box(".monaco-dialog-box");
  save({ name: "clear-color", image: await window.capture({ scale: STILL_SCALE }) });
  await window.key({ key: "Escape" });

  for (const style of ["full", "muted"] as const) {
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
    // inside it: wait for the bar, then until the pixels stop changing.
    await window.box(".part.auxiliarybar");
    await settledPixels({ window });
    save({
      name: style === "full" ? "sidebar-block" : "sidebar-muted",
      image: await window.capture({ scale: STILL_SCALE }),
    });
  }

  writeSettings({
    paths,
    settings: { ...baseSettings(), "toucan.experimental.searchEmoji": true },
  });
  await waitFor({
    what: "the search emoji's consent dialog",
    check: async () => {
      await session.main.focus(STILL_REPO);
      return (
        (await window.evaluate(`document.querySelector(".monaco-dialog-box") !== null`)) === true ||
        undefined
      );
    },
    timeoutMs: STEP_TIMEOUT_MS,
  });
  await window.evaluate(
    `[...document.querySelectorAll(".monaco-dialog-box .monaco-button")].find((b) => b.textContent.trim() === "Change Window Title")?.click()`,
  );
  await window.open("README.md");
  await window.waitFor({
    what: "the emoji in the Command Center",
    expression: `/^\\p{Extended_Pictographic}/u.test(document.querySelector(".command-center")?.innerText ?? "") || undefined`,
  });
  save({ name: "search-emoji", image: await titleBar(window) });
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
