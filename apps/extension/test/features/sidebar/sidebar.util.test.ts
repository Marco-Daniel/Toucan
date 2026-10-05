// import libraries
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// import utils
import {
  REMEMBER_CLOSE_DELAY_MS,
  resolveSidebarSettings,
  SidebarController,
} from "../../../src/features/sidebar/sidebar.util.ts";

/**
 * A fake workspace and view. `calls` records every port call in order, so a test
 * can pin what happened and in which order. `closed` is the remembered flag,
 * seeded by the test. `failReveals` and `failWrites` make reveal and the flag
 * write reject. Warnings land in `warnings`.
 */
function setup(
  initial: {
    enabled?: boolean;
    closed?: boolean;
    failReveals?: boolean;
    failWrites?: boolean;
  } = {},
) {
  const { closed, failReveals, failWrites, enabled } = initial;
  const settings = { enabled: enabled ?? true };
  const state = {
    closed: closed ?? false,
    calls: [] as string[],
    warnings: [] as string[],
  };
  const controller = new SidebarController({
    ports: {
      reveal: async () => {
        state.calls.push("reveal");
        if (failReveals) {
          throw new Error("view not registered");
        }
      },
      setShown: async (shown) => {
        state.calls.push(`setShown:${shown}`);
      },
      readClosed: () => state.closed,
      writeClosed: async (value) => {
        if (failWrites) {
          throw new Error("workspace state unavailable");
        }
        state.calls.push(`writeClosed:${value}`);
        state.closed = value;
      },
      warn: (message) => state.warnings.push(message),
      debug: () => {},
    },
    settings: () => settings,
  });
  return { controller, settings, state };
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("SidebarController, no reveal of its own", () => {
  it("never reveals when the view resolves or the settings are read, so another primary view isn't switched away", async () => {
    // A reveal runs `.focus`, which switches Search or Source Control to the Explorer.
    const { controller, state } = setup();
    controller.viewResolved(true);
    controller.visibilityChanged(false);
    controller.viewResolved(true);
    await vi.advanceTimersByTimeAsync(10 * REMEMBER_CLOSE_DELAY_MS);
    expect(state.calls).toEqual([]);
  });
});

describe("SidebarController, what is not a close", () => {
  it("never remembers a close for a view that stops being visible", async () => {
    // Collapsing, another view and a hidden sidebar all report visible=false.
    const { controller, state } = setup();
    controller.viewResolved(true);
    controller.visibilityChanged(false);
    await vi.advanceTimersByTimeAsync(10 * REMEMBER_CLOSE_DELAY_MS);
    expect(state.calls).toEqual([]);
    expect(state.closed).toBe(false);
  });
});

describe("SidebarController, a Hide from the view's menu", () => {
  it("is remembered after the delay, and hides the view through its key", async () => {
    const { controller, state } = setup();
    controller.viewResolved(true);
    controller.viewDisposed();
    await vi.advanceTimersByTimeAsync(REMEMBER_CLOSE_DELAY_MS);
    expect(state.calls).toEqual(["writeClosed:true", "setShown:false"]);
  });

  it("isn't remembered before the delay is over", async () => {
    const { controller, state } = setup();
    controller.viewResolved(true);
    controller.viewDisposed();
    await vi.advanceTimersByTimeAsync(REMEMBER_CLOSE_DELAY_MS - 1);
    expect(state.calls).toEqual([]);
  });

  it("isn't remembered when VS Code resolves the view again in time, as after a move", async () => {
    const { controller, state } = setup();
    controller.viewResolved(true);
    controller.viewDisposed();
    await vi.advanceTimersByTimeAsync(REMEMBER_CLOSE_DELAY_MS - 1);
    controller.viewResolved(true);
    await vi.advanceTimersByTimeAsync(10 * REMEMBER_CLOSE_DELAY_MS);
    expect(state.calls).toEqual([]);
  });

  it("isn't remembered when the controller is disposed first, as in a reload or shutdown", async () => {
    const { controller, state } = setup();
    controller.viewResolved(true);
    controller.viewDisposed();
    controller.dispose();
    await vi.advanceTimersByTimeAsync(10 * REMEMBER_CLOSE_DELAY_MS);
    expect(state.calls).toEqual([]);
  });

  it("is ignored while the block is off, where the key hides the view itself", async () => {
    const { controller, settings, state } = setup();
    controller.viewResolved(true);
    settings.enabled = false;
    controller.viewDisposed();
    await vi.advanceTimersByTimeAsync(10 * REMEMBER_CLOSE_DELAY_MS);
    expect(state.calls).toEqual([]);
  });

  it("is ignored when the close is already remembered, so Toucan's own hide isn't recorded twice", async () => {
    const { controller, state } = setup({ closed: true });
    controller.viewDisposed();
    await vi.advanceTimersByTimeAsync(10 * REMEMBER_CLOSE_DELAY_MS);
    expect(state.calls).toEqual([]);
  });

  it("is ignored from a view VS Code disposes after the controller", async () => {
    const { controller, state } = setup();
    controller.dispose();
    controller.viewDisposed();
    await vi.advanceTimersByTimeAsync(10 * REMEMBER_CLOSE_DELAY_MS);
    expect(state.calls).toEqual([]);
  });

  it("logs a failed write instead of leaving it unhandled", async () => {
    const { controller, state } = setup({ failWrites: true });
    controller.viewDisposed();
    await vi.advanceTimersByTimeAsync(REMEMBER_CLOSE_DELAY_MS);
    expect(state.warnings).toEqual([
      "Remembering the hide failed: Error: workspace state unavailable",
    ]);
  });
});

describe("SidebarController, toggle", () => {
  it("hides a visible block: remembers the close first, then drops the key", async () => {
    const { controller, state } = setup();
    controller.viewResolved(true);
    await controller.toggle();
    expect(state.calls).toEqual(["writeClosed:true", "setShown:false"]);
  });

  it("shows a collapsed block: reveals and expands it instead of hiding it", async () => {
    const { controller, state } = setup();
    controller.viewResolved(true);
    controller.visibilityChanged(false);
    await controller.toggle();
    expect(state.calls).toEqual(["writeClosed:false", "setShown:true", "reveal"]);
  });

  it("shows a block the user hid, forgetting the close", async () => {
    const { controller, state } = setup();
    controller.viewResolved(true);
    controller.viewDisposed();
    await vi.advanceTimersByTimeAsync(REMEMBER_CLOSE_DELAY_MS);
    state.calls.length = 0;
    await controller.toggle();
    expect(state.calls).toEqual(["writeClosed:false", "setShown:true", "reveal"]);
    expect(state.closed).toBe(false);
  });

  it("cancels a pending Hide, so showing the block isn't followed by a late close", async () => {
    const { controller, state } = setup();
    controller.viewResolved(true);
    controller.viewDisposed();
    await controller.toggle();
    await vi.advanceTimersByTimeAsync(10 * REMEMBER_CLOSE_DELAY_MS);
    expect(state.closed).toBe(false);
    expect(state.calls).toEqual(["writeClosed:false", "setShown:true", "reveal"]);
  });

  it("doesn't take the dispose its own hide causes for a user's Hide", async () => {
    const { controller, state } = setup();
    controller.viewResolved(true);
    await controller.toggle();
    controller.viewDisposed();
    await vi.advanceTimersByTimeAsync(10 * REMEMBER_CLOSE_DELAY_MS);
    expect(state.calls).toEqual(["writeClosed:true", "setShown:false"]);
  });
});

describe("SidebarController, toggle failures", () => {
  it("rejects when the reveal fails, so the command reports it", async () => {
    const { controller, state } = setup({ failReveals: true });
    controller.viewResolved(true);
    controller.visibilityChanged(false);
    await expect(controller.toggle()).rejects.toThrow("view not registered");
    expect(state.calls).toEqual(["writeClosed:false", "setShown:true", "reveal"]);
  });
});

describe("resolveSidebarSettings", () => {
  it("is enabled only for a repo with a color and the setting on", () => {
    expect(resolveSidebarSettings({ enabled: true, style: "full", repo: undefined }).enabled).toBe(
      false,
    );
    expect(resolveSidebarSettings({ enabled: false, style: "full", repo: {} }).enabled).toBe(false);
    expect(resolveSidebarSettings({ enabled: "yes", style: "full", repo: {} }).enabled).toBe(false);
    expect(resolveSidebarSettings({ enabled: true, style: "full", repo: {} }).enabled).toBe(true);
  });

  it("keeps a valid style and falls back to full for anything else", () => {
    expect(resolveSidebarSettings({ enabled: true, style: "muted", repo: {} }).style).toBe("muted");
    expect(resolveSidebarSettings({ enabled: true, style: "loud", repo: {} }).style).toBe("full");
  });
});
