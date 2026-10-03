// import libraries
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// import utils
import {
  REMEMBER_CLOSE_DELAY_MS,
  resolveSidebarSettings,
  SidebarController,
} from "../../../src/features/sidebar/sidebar.util.ts";

// import types
import type { SidebarSettings } from "../../../src/features/sidebar/sidebar.util.ts";

/**
 * A fake secondary sidebar: reveal and close feed visibility back like VS Code
 * does, unless `silentClose` or `silentReveal` suppress that event. With
 * `holdReveals`, each reveal stays pending until `release()`. `failReveals`,
 * `failCloses` and `failWrites` make reveal, closeBar and writeClosed reject;
 * `failCloses: "sync"` makes closeBar throw before it returns a promise.
 * Warnings land in `state.warnings`.
 */
function setup(
  initial: Partial<SidebarSettings> & {
    closed?: boolean;
    silentClose?: boolean;
    silentReveal?: boolean;
    holdReveals?: boolean;
    failReveals?: boolean;
    failCloses?: boolean | "sync";
    failWrites?: boolean;
  } = {},
) {
  const {
    closed: initiallyClosed,
    silentClose,
    silentReveal,
    holdReveals,
    failReveals,
    failCloses,
    failWrites,
    ...rest
  } = initial;
  const held: (() => void)[] = [];
  const release = () => {
    for (const resolve of held.splice(0)) {
      resolve();
    }
  };
  const settings: SidebarSettings = { enabled: true, visibility: "always", ...rest };
  const state = {
    closed: initiallyClosed ?? false,
    reveals: 0,
    closes: 0,
    warnings: [] as string[],
  };
  let controller!: SidebarController;
  controller = new SidebarController({
    ports: {
      reveal: async () => {
        state.reveals++;
        if (failReveals) {
          throw new Error("view not registered");
        }
        if (holdReveals) {
          await new Promise<void>((resolve) => held.push(resolve));
        }
        if (!silentReveal) {
          controller.visibilityChanged(true);
        }
      },
      closeBar:
        failCloses === "sync"
          ? () => {
              state.closes++;
              throw new Error("closeBar threw before returning a promise");
            }
          : async () => {
              state.closes++;
              if (failCloses) {
                throw new Error("no secondary sidebar");
              }
              if (!silentClose) {
                controller.visibilityChanged(false);
              }
            },
      readClosed: () => state.closed,
      writeClosed: async (closed) => {
        if (failWrites) {
          throw new Error("workspace state unavailable");
        }
        state.closed = closed;
      },
      warn: (message) => state.warnings.push(message),
      debug: () => {},
    },
    settings: () => settings,
  });
  return { controller, settings, state, release };
}

type Setup = ReturnType<typeof setup>;

const settle = () => vi.advanceTimersByTimeAsync(0);

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("SidebarController, always", () => {
  it("reveals on startup and does nothing on focus changes", async () => {
    const { controller, state } = setup();
    controller.start(true);
    await settle();
    controller.setFocused(false);
    controller.setFocused(true);
    await settle();
    expect(state).toMatchObject({ reveals: 1, closes: 0 });
  });

  it("does nothing while disabled", async () => {
    const { controller, state } = setup({ enabled: false });
    controller.start(false);
    controller.setFocused(true);
    await settle();
    expect(state).toMatchObject({ reveals: 0, closes: 0 });
  });

  it("remembers a user close only after the delay, then stays closed on the next start", async () => {
    const { controller, state } = setup();
    controller.start(true);
    await settle();
    controller.visibilityChanged(false); // the user closed it, or switched to Chat
    await vi.advanceTimersByTimeAsync(1499);
    expect(state.closed).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(state.closed).toBe(true);

    const next = setup({ closed: true });
    next.controller.start(true);
    await settle();
    expect(next.state.reveals).toBe(0);
  });

  it("doesn't remember a close that a reload or shutdown interrupts", async () => {
    const { controller, state } = setup();
    controller.start(true);
    await settle();
    controller.visibilityChanged(false);
    controller.dispose(); // the extension host stops before the delay
    await vi.advanceTimersByTimeAsync(REMEMBER_CLOSE_DELAY_MS * 2);
    expect(state.closed).toBe(false);
  });

  it("doesn't remember a hide while the window is unfocused", async () => {
    const { controller, state } = setup();
    controller.start(false);
    await settle();
    controller.visibilityChanged(false);
    await vi.advanceTimersByTimeAsync(REMEMBER_CLOSE_DELAY_MS);
    expect(state.closed).toBe(false);
  });

  it("forgets the remembered close when the user opens the block", async () => {
    const { controller, state } = setup({ closed: true });
    controller.start(true);
    controller.visibilityChanged(true);
    await settle();
    expect(state.closed).toBe(false);
  });

  it("toggle closes (remembered like a user close) and reopens (forgotten)", async () => {
    const { controller, state } = setup();
    controller.start(true);
    await settle();
    await controller.toggle();
    await vi.advanceTimersByTimeAsync(REMEMBER_CLOSE_DELAY_MS);
    expect(state).toMatchObject({ closes: 1, closed: true });
    await controller.toggle();
    expect(state).toMatchObject({ reveals: 2, closed: false });
  });

  it("toggle forgets the remembered close itself, without waiting for a visibility event", async () => {
    const { controller, state } = setup({ closed: true, silentReveal: true });
    controller.start(true);
    await controller.toggle();
    expect(state).toMatchObject({ reveals: 1, closed: false });
  });
});

describe("SidebarController, unfocused", () => {
  it("reveals on blur and closes on focus only what it opened", async () => {
    const { controller, state } = setup({ visibility: "unfocused" });
    controller.start(true);
    controller.setFocused(false);
    await settle();
    expect(state.reveals).toBe(1);
    controller.setFocused(true);
    await settle();
    expect(state.closes).toBe(1);
  });

  it("leaves a block the user already had open", async () => {
    const { controller, state } = setup({ visibility: "unfocused" });
    controller.start(true);
    controller.visibilityChanged(true); // the user opened it
    controller.setFocused(false);
    controller.setFocused(true);
    await settle();
    expect(state).toMatchObject({ reveals: 0, closes: 0 });
  });

  it("reveals at startup when the window starts unfocused", async () => {
    const { controller, state } = setup({ visibility: "unfocused" });
    controller.start(false);
    await settle();
    expect(state.reveals).toBe(1);
  });

  it("never remembers Toucan's own closes, so switching to always starts open", async () => {
    const { controller, settings, state } = setup({ visibility: "unfocused" });
    controller.start(true);
    controller.setFocused(false);
    await settle();
    controller.setFocused(true);
    await vi.advanceTimersByTimeAsync(REMEMBER_CLOSE_DELAY_MS * 2);
    expect(state.closed).toBe(false);

    settings.visibility = "always";
    controller.settingsChanged();
    await settle();
    expect(state.reveals).toBe(2);
  });
});

describe("SidebarController, edge cases", () => {
  it("remembers a close followed by switching apps within the delay", async () => {
    const { controller, state } = setup();
    controller.start(true);
    await settle();
    controller.visibilityChanged(false);
    controller.setFocused(false);
    await vi.advanceTimersByTimeAsync(REMEMBER_CLOSE_DELAY_MS);
    expect(state.closed).toBe(true);
  });

  it("doesn't let a silent Toucan close swallow the user's next close", async () => {
    const { controller, settings, state } = setup({ visibility: "unfocused", silentClose: true });
    controller.start(false);
    await settle(); // revealed by Toucan, so Toucan closes it on focus
    controller.setFocused(true);
    await settle();
    expect(state.closes).toBe(1); // Toucan closed the bar; no visibility event followed
    settings.visibility = "always";
    controller.setFocused(false);
    controller.setFocused(true);
    controller.visibilityChanged(false); // the user's real close
    await vi.advanceTimersByTimeAsync(1500);
    expect(state.closed).toBe(true);
  });

  it("forgets a close the user undoes within the delay", async () => {
    const { controller, state } = setup();
    controller.start(true);
    await settle();
    controller.visibilityChanged(false); // closed, or a flicker to Chat and back
    await vi.advanceTimersByTimeAsync(750);
    controller.visibilityChanged(true); // reopened before the delay ran out
    await vi.advanceTimersByTimeAsync(3000);
    expect(state.closed).toBe(false);
  });
});

describe("SidebarController, remembered close across modes", () => {
  it("keeps the close when Toucan reveals the block in unfocused mode", async () => {
    const { controller, state } = setup({ visibility: "unfocused", closed: true });
    controller.start(true);
    controller.setFocused(false);
    await settle();
    expect(state.reveals).toBe(1);
    expect(state.closed).toBe(true);
  });
});

describe("SidebarController, after dispose", () => {
  it("doesn't remember a close from a view VS Code disposes after the controller", async () => {
    const { controller, state } = setup();
    controller.start(true);
    await settle();
    controller.dispose();
    controller.visibilityChanged(false); // the view's onDidDispose fires late
    await vi.advanceTimersByTimeAsync(REMEMBER_CLOSE_DELAY_MS * 2);
    expect(state.closed).toBe(false);
  });

  it("ignores focus and settings changes", async () => {
    const { controller, settings, state } = setup({ visibility: "unfocused" });
    controller.start(true);
    controller.dispose();
    controller.setFocused(false);
    settings.visibility = "always";
    controller.settingsChanged();
    await settle();
    expect(state).toMatchObject({ reveals: 0, closes: 0 });
  });
});

describe("SidebarController, settings changes", () => {
  it("reveals when the block is turned on", async () => {
    const { controller, settings, state } = setup({ enabled: false });
    controller.start(true);
    settings.enabled = true;
    controller.settingsChanged();
    await settle();
    expect(state.reveals).toBe(1);
  });

  it("does nothing on a settings change while disabled", async () => {
    const { controller, state } = setup({ enabled: false });
    controller.start(true);
    controller.settingsChanged();
    await settle();
    expect(state.reveals).toBe(0);
  });

  it("does nothing on a settings change before start()", async () => {
    const { controller, state } = setup();
    controller.settingsChanged();
    await settle();
    expect(state.reveals).toBe(0);
  });

  it("doesn't reveal again while the block is visible", async () => {
    const { controller, state } = setup();
    controller.start(true);
    await settle();
    controller.settingsChanged();
    await settle();
    expect(state.reveals).toBe(1);
  });

  it("closes the bar when a visible block goes off, and reveals it again when it comes back", async () => {
    const { controller, settings, state } = setup();
    controller.start(true);
    await settle();
    settings.enabled = false;
    controller.settingsChanged();
    await settle();
    expect(state.closes).toBe(1);
    await vi.advanceTimersByTimeAsync(REMEMBER_CLOSE_DELAY_MS * 2);
    expect(state.closed).toBe(false);
    settings.enabled = true;
    controller.settingsChanged();
    await settle();
    expect(state.reveals).toBe(2);
  });

  it("never remembers its close, even when the block is back on before the close's event", async () => {
    const { controller, settings, state } = setup({ silentClose: true });
    controller.start(true);
    await settle();
    settings.enabled = false;
    controller.settingsChanged();
    await settle();
    settings.enabled = true;
    // The close's visibility event, arriving after the color came back.
    controller.visibilityChanged(false);
    await vi.advanceTimersByTimeAsync(REMEMBER_CLOSE_DELAY_MS * 2);
    expect([state.closes, state.closed]).toEqual([1, false]);
  });

  it("doesn't close the bar for a block that isn't visible", async () => {
    const { controller, settings, state } = setup({ closed: true });
    controller.start(true);
    await settle();
    settings.enabled = false;
    controller.settingsChanged();
    await settle();
    expect([state.reveals, state.closes]).toEqual([0, 0]);
  });

  it("doesn't start a second reveal while one is still running", async () => {
    const { controller, state, release } = setup({ holdReveals: true });
    controller.start(true);
    controller.settingsChanged();
    release();
    await settle();
    expect(state.reveals).toBe(1);
  });
});

describe("resolveSidebarSettings", () => {
  it("is enabled only for a repo with a color", () => {
    const base = { enabled: true, style: "full", visibility: "always" };
    expect(resolveSidebarSettings({ ...base, repo: {} }).enabled).toBe(true);
    expect(resolveSidebarSettings({ ...base, repo: undefined }).enabled).toBe(false);
    expect(resolveSidebarSettings({ ...base, enabled: "yes", repo: {} }).enabled).toBe(false);
  });

  it("lets the repo's visibility override the general one", () => {
    expect(
      resolveSidebarSettings({
        enabled: true,
        style: "muted",
        visibility: "always",
        repo: { sidebarBlock: "unfocused" },
      }),
    ).toEqual({ enabled: true, visibility: "unfocused", style: "muted" });
  });

  it("falls back to the defaults for unexpected values", () => {
    expect(
      resolveSidebarSettings({ enabled: true, style: "loud", visibility: "sometimes", repo: {} }),
    ).toEqual({ enabled: true, visibility: "always", style: "full" });
  });
});

describe("SidebarController, hand-off timing", () => {
  // The reveal starts within the triggering call, so its `revealing` guard is
  // set before anything else can run, not a tick later.
  it("calls the reveal port before the triggering call returns", () => {
    const { controller, state } = setup();
    controller.start(true);
    expect(state.reveals).toBe(1);
  });
});

describe("SidebarController, failures", () => {
  // Every place the controller starts async work from an event or timer.
  it.each([
    {
      site: "the startup reveal",
      options: { failReveals: true },
      act: async ({ controller }: Setup) => {
        controller.start(true);
      },
      warning: "Revealing the block failed: Error: view not registered",
    },
    {
      site: "the reveal after turning the block on",
      options: { enabled: false, failReveals: true },
      act: async ({ controller, settings }: Setup) => {
        controller.start(true);
        settings.enabled = true;
        controller.settingsChanged();
      },
      warning: "Revealing the block failed: Error: view not registered",
    },
    {
      site: "the reveal on blur",
      options: { visibility: "unfocused", failReveals: true },
      act: async ({ controller }: Setup) => {
        controller.start(true);
        controller.setFocused(false);
      },
      warning: "Revealing the block failed: Error: view not registered",
    },
    {
      site: "the close on focus",
      options: { visibility: "unfocused", failCloses: true },
      act: async ({ controller }: Setup) => {
        controller.start(false);
        await settle();
        controller.setFocused(true);
      },
      warning: "Closing the bar failed: Error: no secondary sidebar",
    },
    {
      site: "the close when the block goes off",
      options: { failCloses: true },
      act: async ({ controller, settings }: Setup) => {
        controller.start(true);
        await settle();
        settings.enabled = false;
        controller.settingsChanged();
      },
      warning: "Closing the bar failed: Error: no secondary sidebar",
    },
    {
      site: "a close that throws before it starts",
      options: { visibility: "unfocused", failCloses: "sync" },
      act: async ({ controller }: Setup) => {
        controller.start(false);
        await settle();
        controller.setFocused(true);
      },
      warning: "Closing the bar failed: Error: closeBar threw before returning a promise",
    },
    {
      site: "forgetting a remembered close",
      options: { closed: true, failWrites: true },
      act: async ({ controller }: Setup) => {
        controller.start(true);
        controller.visibilityChanged(true);
      },
      warning: "Forgetting the close failed: Error: workspace state unavailable",
    },
    {
      site: "remembering a close",
      options: { failWrites: true },
      act: async ({ controller }: Setup) => {
        controller.start(true);
        await settle();
        controller.visibilityChanged(false);
        await vi.advanceTimersByTimeAsync(REMEMBER_CLOSE_DELAY_MS);
      },
      warning: "Remembering the close failed: Error: workspace state unavailable",
    },
  ] as const)("logs a failure in $site instead of leaving it unhandled", async (row) => {
    const sidebar = setup(row.options);
    await row.act(sidebar);
    await settle();
    expect(sidebar.state.warnings).toEqual([row.warning]);
  });
});
