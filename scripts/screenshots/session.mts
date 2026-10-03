// The README screenshot script's throwaway VS Code: a temp folder with the
// demo repositories and a fresh profile, the instance with DevTools on, and a
// connection to each window and to the main process.
// import libraries
import { spawn, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { createServer } from "node:net";
import { dirname, join } from "node:path";

// import utils
import { DevToolsSession, listTargets } from "./cdp.mts";
import { REPOS } from "./fixture.mts";
import { Main, STEP_TIMEOUT_MS, titleNames, Window } from "./vscode.mts";
import { waitFor } from "./wait.mts";
import { tryCatch } from "../../src/shared/async/tryCatch.util.ts";
import { isRecord } from "../../src/shared/records/records.util.ts";

// import types
import type { ChildProcess } from "node:child_process";

/**
 * VS Code's IPC socket lives in the user-data-dir and macOS caps socket paths
 * at about 100 characters, so the temp folder sits in /tmp, not os.tmpdir().
 */
const TEMP_PARENT = "/tmp";
const JSON_INDENT = 2;
/** The VS Code CLI installs the VSIX or opens a window; it never needs longer. */
const CLI_TIMEOUT_MS = 60_000;

/** The settings every demo window starts with. */
export function baseSettings(): Record<string, unknown> {
  return {
    "toucan.repos": Object.fromEntries(
      REPOS.map(({ name, background, glyph }) => [name, { background, glyph }]),
    ),
    "workbench.colorTheme": "Default Dark Modern",
    // Modal dialogs as part of the page, so they can be driven and captured.
    "window.dialogStyle": "custom",
    "window.restoreWindows": "none",
    "workbench.startupEditor": "none",
    "workbench.tips.enabled": false,
    "workbench.secondarySideBar.defaultVisibility": "hidden",
    "security.workspace.trust.enabled": false,
    "chat.disableAIFeatures": true,
    // Answers Toucan's agents-control offer up front, so its notification stays out of the shots.
    "chat.agentsControl.enabled": "badge",
    "git.enabled": false,
    "breadcrumbs.enabled": false,
    "editor.minimap.enabled": false,
    "editor.lightbulb.enabled": "off",
    // The demo files have no node_modules; their type errors would only add noise.
    "typescript.validate.enable": false,
    "javascript.validate.enable": false,
    "problems.decorations.enabled": false,
    "update.mode": "none",
    "telemetry.telemetryLevel": "off",
    "extensions.autoUpdate": false,
    "extensions.autoCheckUpdates": false,
    "extensions.ignoreRecommendations": true,
  };
}

export interface Paths {
  temp: string;
  /** HOME and TMPDIR for VS Code, inside the temp folder. */
  home: string;
  tmp: string;
  /** The images, until the whole run has succeeded. */
  staging: string;
  userData: string;
  extensions: string;
  settings: string;
  electron: string;
  cli: string;
}

/** A new temp folder, and where VS Code's parts are in the app. */
export function makePaths(app: string): Paths {
  const temp = mkdtempSync(join(TEMP_PARENT, "toucan-shots-"));
  const userData = join(temp, "data");
  return {
    temp,
    home: join(temp, "home"),
    tmp: join(temp, "tmp"),
    staging: join(temp, "out"),
    userData,
    extensions: join(temp, "ext"),
    settings: join(userData, "User", "settings.json"),
    electron: join(app, "Contents", "MacOS", "Code"),
    cli: join(app, "Contents", "Resources", "app", "bin", "code"),
  };
}

/**
 * The only environment VS Code gets: PATH, and a HOME and TMPDIR inside the
 * temp folder, so nothing of the developer's own setup (or of a VS Code this
 * may run inside) reaches the demo.
 */
function demoEnv(paths: Paths): NodeJS.ProcessEnv {
  return { PATH: process.env["PATH"] ?? "", HOME: paths.home, TMPDIR: paths.tmp };
}

export async function freePort(): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  await new Promise<void>((resolve) => server.close(() => resolve()));
  if (!isRecord(address) || typeof address["port"] !== "number") {
    throw new Error("No free port");
  }
  return address["port"];
}

interface WriteSettingsArgs {
  paths: Paths;
  settings: Record<string, unknown>;
}

export function writeSettings({ paths, settings }: WriteSettingsArgs): void {
  writeFileSync(paths.settings, `${JSON.stringify(settings, null, JSON_INDENT)}\n`);
}

interface SetUpArgs {
  paths: Paths;
  vsix: string;
}

/** The demo repositories, the profile's settings and the installed VSIX. */
export function setUp({ paths, vsix }: SetUpArgs): void {
  for (const { name, files } of REPOS) {
    for (const [file, text] of Object.entries(files)) {
      mkdirSync(dirname(join(paths.temp, name, file)), { recursive: true });
      writeFileSync(join(paths.temp, name, file), text);
    }
  }
  mkdirSync(join(paths.userData, "User"), { recursive: true });
  mkdirSync(paths.home, { recursive: true });
  mkdirSync(paths.tmp, { recursive: true });
  mkdirSync(paths.staging, { recursive: true });
  writeSettings({ paths, settings: baseSettings() });
  const install = spawnSync(paths.cli, [...profile(paths), "--install-extension", vsix], {
    env: demoEnv(paths),
    timeout: CLI_TIMEOUT_MS,
    encoding: "utf8",
  });
  if (install.status !== 0) {
    throw new Error(
      `Installing the VSIX failed: ${install.error?.message ?? install.stderr ?? `exit ${install.status}`}`,
    );
  }
}

/** The arguments that keep VS Code on the throwaway profile. */
function profile(paths: Paths): string[] {
  return [
    "--user-data-dir",
    paths.userData,
    "--extensions-dir",
    paths.extensions,
    // With HOME in the temp folder there's no login keychain; macOS would block VS Code
    // with a keychain dialog. Secrets stay in memory instead (there are none to keep).
    "--use-inmemory-secretstorage",
    // Its "Analyzing" status would show in the shots, and the demo files have no types to find.
    "--disable-extension",
    "vscode.typescript-language-features",
  ];
}

export interface LaunchArgs {
  paths: Paths;
  /** DevTools for the windows' pages. */
  pagePort: number;
  /** DevTools for the main process. */
  mainPort: number;
}

/** Starts VS Code with the first demo repository, in its own process group. */
export function launch({ paths, pagePort, mainPort }: LaunchArgs): ChildProcess {
  const [first] = REPOS;
  return spawn(
    paths.electron,
    [
      ...profile(paths),
      `--remote-debugging-port=${pagePort}`,
      `--inspect=${mainPort}`,
      "--new-window",
      join(paths.temp, first.name),
    ],
    { env: demoEnv(paths), detached: true, stdio: "ignore" },
  );
}

export class Session {
  readonly main: Main;
  private readonly windows: ReadonlyMap<string, Window>;

  constructor({ main, windows }: { main: Main; windows: ReadonlyMap<string, Window> }) {
    this.main = main;
    this.windows = windows;
  }

  window(name: string): Window {
    const window = this.windows.get(name);
    if (!window) {
      throw new Error(`No window for ${name}`);
    }
    return window;
  }

  all(): Window[] {
    return [...this.windows.values()];
  }
}

/**
 * Opens the other demo repositories in the running instance, each in its own
 * window (one launch with several folders would make a single multi-root
 * window), and connects to every window and to the main process.
 */
export async function connect({ paths, pagePort, mainPort }: LaunchArgs): Promise<Session> {
  await waitFor({
    what: "the first window",
    check: async () => {
      const [, error] = await tryCatch(() => listTargets(pagePort));
      return error === null || undefined;
    },
    timeoutMs: STEP_TIMEOUT_MS,
  });
  for (const { name } of REPOS.slice(1)) {
    spawnSync(paths.cli, [...profile(paths), "--new-window", join(paths.temp, name)], {
      env: demoEnv(paths),
      timeout: CLI_TIMEOUT_MS,
    });
  }
  const windows = new Map<string, Window>();
  await waitFor({
    what: "every demo window",
    check: async () => {
      const pages = (await listTargets(pagePort)).filter(
        ({ type, url }) => type === "page" && url.includes("workbench"),
      );
      for (const { name } of REPOS) {
        const page = pages.find(({ title }) => titleNames({ title, name }));
        if (page && !windows.has(name)) {
          windows.set(
            name,
            new Window({ name, page: await DevToolsSession.connect(page.webSocketDebuggerUrl) }),
          );
        }
      }
      return windows.size === REPOS.length || undefined;
    },
    timeoutMs: STEP_TIMEOUT_MS,
  });
  const [mainTarget] = await listTargets(mainPort);
  if (!mainTarget) {
    throw new Error("No main process inspector");
  }
  const main = new Main(await DevToolsSession.connect(mainTarget.webSocketDebuggerUrl));
  return new Session({ main, windows });
}
