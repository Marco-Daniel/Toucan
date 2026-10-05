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
 * can pin what happened and in which order. `closed` and `revealed` are the
 * remembered flags, seeded by the test. With `holdReveals`, each reveal stays
 * pending until `release()`. `failReveals` and `failWrites` make reveal and the
 * flag writes reject. Warnings land in `warnings`.
 */
function setup(
  initial: {
    enabled?: boolean;
    closed?: boolean;
    revealed?: boolean;
    holdReveals?: boolean;
    failReveals?: boolean;
    failWrites?: boolean;
  } = {},
) {
  const { closed, revealed, holdReveals, failReveals, failWrites, enabled } = initial;
  const held: (() => void)[] = [];
  const release = () => {
    for (const resolve of held.splice(0)) {
      resolve();
    }
  };
  const settings = { enabled: enabled ?? true };
  const state = {
    closed: closed ?? false,
    revealed: revealed ?? false,
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
        if (holdReveals) {
          await new Promise<void>((resolve) => held.push(resolve));
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
      readRevealed: () => state.revealed,
      writeRevealed: async (value) => {
        if (failWrites) {
          throw new Error("workspace state unavailable");
        }
        state.calls.push(`writeRevealed:${value}`);
        state.revealed = value;
      },
      warn: (message) => state.warnings.push(message),
      debug: () => {},
    },
    settings: () => settings,
  });
  return { controller, settings, state, release };
}

const settle = () => vi.advanceTimersByTimeAsync(0);

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("SidebarController, reveal", () => {
  it("reveals once on the first start in a workspace and remembers it", async () => {
    const { controller, state } = setup();
    controller.start();
    await settle();
    expect(state.calls).toEqual(["reveal", "writeRevealed:true"]);
  });

  it("doesn't reveal again on a later start, so a collapsed block stays collapsed", async () => {
    const { controller, state } = setup({ revealed: true });
    controller.start();
    await settle();
    expect(state.calls).toEqual([]);
  });

  it("doesn't reveal while the block is off", async () => {
    const { controller, state } = setup({ enabled: false });
    controller.start();
    await settle();
    expect(state.calls).toEqual([]);
  });

  it("doesn't reveal a block remembered as closed, even one never revealed", async () => {
    const { controller, state } = setup({ closed: true });
    controller.start();
    await settle();
    expect(state.calls).toEqual([]);
  });

  it("calls the reveal port before the triggering call returns", () => {
    const { controller, state } = setup();
    controller.start();
    expect(state.calls).toEqual(["reveal"]);
  });

  it("doesn't remember a reveal that failed, so the next start tries again", async () => {
    const { controller, state } = setup({ failReveals: true });
    controller.start();
    await settle();
    expect(state.calls).toEqual(["reveal"]);
    expect(state.revealed).toBe(false);
    expect(state.warnings).toEqual(["Revealing the block failed: Error: view not registered"]);
  });

  it("doesn't start a second reveal while one is still running", async () => {
    const { controller, settings, state, release } = setup({ holdReveals: true, enabled: false });
    controller.start();
    settings.enabled = true;
    controller.settingsChanged();
    controller.settingsChanged();
    await settle();
    expect(state.calls).toEqual(["reveal"]);
    release();
    await settle();
    expect(state.calls).toEqual(["reveal", "writeRevealed:true"]);
  });
});

describe("SidebarController, settings changes", () => {
  it("reveals when the block is turned on, even in a workspace it revealed before", async () => {
    const { controller, settings, state } = setup({ revealed: true, enabled: false });
    controller.start();
    settings.enabled = true;
    controller.settingsChanged();
    await settle();
    expect(state.calls).toEqual(["reveal", "writeRevealed:true"]);
  });

  it("reveals again when the block goes off and on", async () => {
    const { controller, settings, state } = setup({ revealed: true });
    controller.start();
    settings.enabled = false;
    controller.settingsChanged();
    settings.enabled = true;
    controller.settingsChanged();
    await settle();
    expect(state.calls).toEqual(["reveal", "writeRevealed:true"]);
  });

  it("doesn't reveal on a change that leaves the block on, such as a style change", async () => {
    const { controller, state } = setup({ revealed: true });
    controller.start();
    controller.settingsChanged();
    await settle();
    expect(state.calls).toEqual([]);
  });

  it("doesn't reveal a block turned on while it is remembered as closed", async () => {
    const { controller, settings, state } = setup({ closed: true, revealed: true, enabled: false });
    controller.start();
    settings.enabled = true;
    controller.settingsChanged();
    await settle();
    expect(state.calls).toEqual([]);
  });

  it("does nothing before start()", async () => {
    const { controller, state } = setup();
    controller.settingsChanged();
    await settle();
    expect(state.calls).toEqual([]);
  });
});

describe("SidebarController, what is not a close", () => {
  it("never remembers a close for a view that stops being visible", async () => {
    // Collapsing, another view and a hidden sidebar all report visible=false.
    const { controller, state } = setup({ revealed: true });
    controller.start();
    controller.viewResolved(true);
    controller.visibilityChanged(false);
    await vi.advanceTimersByTimeAsync(10 * REMEMBER_CLOSE_DELAY_MS);
    expect(state.calls).toEqual([]);
    expect(state.closed).toBe(false);
  });
});

describe("SidebarController, a Hide from the view's menu", () => {
  it("is remembered after the delay, and hides the view through its key", async () => {
    const { controller, state } = setup({ revealed: true });
    controller.start();
    controller.viewResolved(true);
    controller.viewDisposed();
    await vi.advanceTimersByTimeAsync(REMEMBER_CLOSE_DELAY_MS);
    expect(state.calls).toEqual(["writeClosed:true", "setShown:false"]);
  });

  it("isn't remembered before the delay is over", async () => {
    const { controller, state } = setup({ revealed: true });
    controller.start();
    controller.viewResolved(true);
    controller.viewDisposed();
    await vi.advanceTimersByTimeAsync(REMEMBER_CLOSE_DELAY_MS - 1);
    expect(state.calls).toEqual([]);
  });

  it("isn't remembered when VS Code resolves the view again in time, as after a move", async () => {
    const { controller, state } = setup({ revealed: true });
    controller.start();
    controller.viewResolved(true);
    controller.viewDisposed();
    await vi.advanceTimersByTimeAsync(REMEMBER_CLOSE_DELAY_MS - 1);
    controller.viewResolved(true);
    await vi.advanceTimersByTimeAsync(10 * REMEMBER_CLOSE_DELAY_MS);
    expect(state.calls).toEqual([]);
  });

  it("isn't remembered when the controller is disposed first, as in a reload or shutdown", async () => {
    const { controller, state } = setup({ revealed: true });
    controller.start();
    controller.viewResolved(true);
    controller.viewDisposed();
    controller.dispose();
    await vi.advanceTimersByTimeAsync(10 * REMEMBER_CLOSE_DELAY_MS);
    expect(state.calls).toEqual([]);
  });

  it("is ignored while the block is off, where the key hides the view itself", async () => {
    const { controller, settings, state } = setup({ revealed: true });
    controller.start();
    controller.viewResolved(true);
    settings.enabled = false;
    controller.viewDisposed();
    await vi.advanceTimersByTimeAsync(10 * REMEMBER_CLOSE_DELAY_MS);
    expect(state.calls).toEqual([]);
  });

  it("is ignored when the close is already remembered, so Toucan's own hide isn't recorded twice", async () => {
    const { controller, state } = setup({ revealed: true, closed: true });
    controller.start();
    controller.viewDisposed();
    await vi.advanceTimersByTimeAsync(10 * REMEMBER_CLOSE_DELAY_MS);
    expect(state.calls).toEqual([]);
  });

  it("is ignored from a view VS Code disposes after the controller", async () => {
    const { controller, state } = setup({ revealed: true });
    controller.start();
    controller.dispose();
    controller.viewDisposed();
    await vi.advanceTimersByTimeAsync(10 * REMEMBER_CLOSE_DELAY_MS);
    expect(state.calls).toEqual([]);
  });

  it("logs a failed write instead of leaving it unhandled", async () => {
    const { controller, state } = setup({ revealed: true, failWrites: true });
    controller.start();
    controller.viewDisposed();
    await vi.advanceTimersByTimeAsync(REMEMBER_CLOSE_DELAY_MS);
    expect(state.warnings).toEqual([
      "Remembering the hide failed: Error: workspace state unavailable",
    ]);
  });
});

describe("SidebarController, toggle", () => {
  it("hides a visible block: remembers the close first, then drops the key", async () => {
    const { controller, state } = setup({ revealed: true });
    controller.start();
    controller.viewResolved(true);
    await controller.toggle();
    expect(state.calls).toEqual(["writeClosed:true", "setShown:false"]);
  });

  it("shows a collapsed block: reveals and expands it instead of hiding it", async () => {
    const { controller, state } = setup({ revealed: true });
    controller.start();
    controller.viewResolved(true);
    controller.visibilityChanged(false);
    await controller.toggle();
    expect(state.calls).toEqual([
      "writeClosed:false",
      "setShown:true",
      "reveal",
      "writeRevealed:true",
    ]);
  });

  it("shows a block the user hid, forgetting the close", async () => {
    const { controller, state } = setup({ revealed: true });
    controller.start();
    controller.viewResolved(true);
    controller.viewDisposed();
    await vi.advanceTimersByTimeAsync(REMEMBER_CLOSE_DELAY_MS);
    state.calls.length = 0;
    await controller.toggle();
    expect(state.calls).toEqual([
      "writeClosed:false",
      "setShown:true",
      "reveal",
      "writeRevealed:true",
    ]);
    expect(state.closed).toBe(false);
  });

  it("cancels a pending Hide, so showing the block isn't followed by a late close", async () => {
    const { controller, state } = setup({ revealed: true });
    controller.start();
    controller.viewResolved(true);
    controller.viewDisposed();
    await controller.toggle();
    await vi.advanceTimersByTimeAsync(10 * REMEMBER_CLOSE_DELAY_MS);
    expect(state.closed).toBe(false);
    expect(state.calls).toEqual([
      "writeClosed:false",
      "setShown:true",
      "reveal",
      "writeRevealed:true",
    ]);
  });

  it("doesn't take the dispose its own hide causes for a user's Hide", async () => {
    const { controller, state } = setup({ revealed: true });
    controller.start();
    controller.viewResolved(true);
    await controller.toggle();
    controller.viewDisposed();
    await vi.advanceTimersByTimeAsync(10 * REMEMBER_CLOSE_DELAY_MS);
    expect(state.calls).toEqual(["writeClosed:true", "setShown:false"]);
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
