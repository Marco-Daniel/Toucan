import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BLUR_DEBOUNCE_MS,
  FocusCoordinator,
  VERIFY_DELAY_MS,
} from "../../../src/features/focus/focus.util.ts";
import { asCustomizations, commandCenterColors } from "../../helpers/commandCenter.ts";

const applied = (background: string) => asCustomizations(commandCenterColors(background));

/** Shared state of several simulated windows: the owner file and user settings. */
class World {
  owner: string | undefined;
  /** The settings as this window's VS Code sees them. */
  settings: Record<string, unknown> | undefined = { "editor.background": "#111111" };
  /** What the guessed settings file holds: the same, something else, or unreadable. */
  disk: "same" | "unreadable" | { value: unknown } = "same";
  /** Whether Toucan has applied a color in this profile before (0008). */
  applied = true;
  markAppliedCalls = 0;
  failMarkApplied = false;
  /** Windows whose globalState hasn't caught up with `applied` yet. */
  lagging = new Set<string>();
  writes = 0;
  /** Which window made each write, in order. */
  writers: string[] = [];
  failWrites = false;
  warnings: string[] = [];
  /** Windows whose next colors write stays pending until `release(id)`. */
  private readonly held = new Map<string, (() => void) | undefined>();

  hold(id: string): void {
    this.held.set(id, undefined);
  }

  release(id: string): void {
    this.held.get(id)?.();
    this.held.delete(id);
  }

  window(id: string, background: string | undefined | (() => string)): FocusCoordinator {
    const desired = typeof background === "function" ? background : () => background;
    return new FocusCoordinator({
      id,
      ports: {
        readOwner: async () => this.owner,
        writeOwner: async (owner) => {
          this.owner = owner;
        },
        hasApplied: () => this.applied && !this.lagging.has(id),
        markApplied: async () => {
          this.markAppliedCalls++;
          if (this.failMarkApplied) {
            throw new Error("globalState is read-only");
          }
          this.applied = true;
        },
        readCustomizations: () => this.settings,
        readCustomizationsFromDisk: async () =>
          this.disk === "same"
            ? { value: this.settings }
            : this.disk === "unreadable"
              ? undefined
              : this.disk,
        writeCustomizations: async (update) => {
          if (this.held.has(id)) {
            await new Promise<void>((resolve) => this.held.set(id, resolve));
          }
          if (this.failWrites) {
            throw new Error("settings.json has unsaved changes");
          }
          this.writes++;
          this.writers.push(id);
          // Like the real writer: the update runs on the settings as they are now.
          const next = update(this.settings);
          if (next) {
            this.settings = next.value;
          }
        },
        warn: (message) => this.warnings.push(`${id}: ${message}`),
        debug: () => {},
      },
      desired: () => {
        const value = desired();
        return value ? commandCenterColors(value) : undefined;
      },
    });
  }

  get background(): unknown {
    return this.settings?.["commandCenter.background"];
  }
}

const settle = () => vi.advanceTimersByTimeAsync(0);

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("FocusCoordinator", () => {
  it("applies on focus and clears after the blur debounce", async () => {
    const world = new World();
    const a = world.window("A", "#aa0000");
    a.setFocused(true);
    await settle();
    expect(world.owner).toBe("A");
    expect(world.background).toBe("#aa0000");
    expect(world.settings?.["editor.background"]).toBe("#111111");

    a.setFocused(false);
    await vi.advanceTimersByTimeAsync(BLUR_DEBOUNCE_MS - 1);
    expect(world.background).toBe("#aa0000");
    await vi.advanceTimersByTimeAsync(1);
    expect(world.settings).toEqual({ "editor.background": "#111111" });
  });

  it("ignores repeated state events without a focus change", async () => {
    const world = new World();
    const a = world.window("A", "#aa0000");
    a.setFocused(true);
    a.setFocused(true);
    await vi.advanceTimersByTimeAsync(VERIFY_DELAY_MS);
    expect(world.writes).toBe(1);
    a.setFocused(false);
    a.setFocused(false);
    await vi.advanceTimersByTimeAsync(BLUR_DEBOUNCE_MS);
    expect(world.writes).toBe(2);
  });

  it("cancels the pending clear when the window is refocused (A→B→A)", async () => {
    const world = new World();
    const a = world.window("A", "#aa0000");
    a.setFocused(true);
    await settle();
    a.setFocused(false);
    await vi.advanceTimersByTimeAsync(BLUR_DEBOUNCE_MS / 2);
    a.setFocused(true);
    await vi.advanceTimersByTimeAsync(BLUR_DEBOUNCE_MS * 4);
    expect(world.background).toBe("#aa0000");
    expect(world.writes).toBe(1);
  });

  it("hands over to the next focused window without the old one clearing it", async () => {
    const world = new World();
    const a = world.window("A", "#aa0000");
    const b = world.window("B", "#0000bb");
    a.setFocused(true);
    await settle();
    a.setFocused(false);
    b.setFocused(true);
    await vi.advanceTimersByTimeAsync(BLUR_DEBOUNCE_MS * 4);
    expect(world.owner).toBe("B");
    expect(world.background).toBe("#0000bb");
    expect(world.writers).toEqual(["A", "B"]); // A never cleared B's colors
  });

  it("takes ownership before writing, so a blur timer firing mid-write doesn't clear", async () => {
    const world = new World();
    const a = world.window("A", "#aa0000");
    const b = world.window("B", "#0000bb");
    a.setFocused(true);
    await settle();
    world.hold("B"); // B's colors write is slow
    a.setFocused(false);
    b.setFocused(true);
    await vi.advanceTimersByTimeAsync(1000); // A's blur check runs while B's write is pending
    expect(world.writers).toEqual(["A"]);
    world.release("B");
    await settle();
    expect(world.writers).toEqual(["A", "B"]);
    expect(world.background).toBe("#0000bb");
  });

  it("keeps a user color saved while Toucan's write was pending", async () => {
    const world = new World();
    const a = world.window("A", "#aa0000");
    world.hold("A");
    a.setFocused(true);
    await settle();
    // The user saves another color while A's write waits (e.g. on the writer's lock).
    world.settings = { ...world.settings, "tab.activeBorder": "#ff00ff" };
    world.release("A");
    await settle();
    expect(world.settings).toEqual({
      "editor.background": "#111111",
      "tab.activeBorder": "#ff00ff",
      ...applied("#aa0000"),
    });
  });

  it("never clears hand-set Command Center colors before Toucan has applied one (0008)", async () => {
    const world = new World();
    world.applied = false;
    world.settings = { "commandCenter.background": "#123456", "editor.background": "#111111" };
    const plain = world.window("P", undefined); // a folder without a Toucan color
    plain.setFocused(true);
    await settle();
    plain.setFocused(false);
    await vi.advanceTimersByTimeAsync(BLUR_DEBOUNCE_MS * 2);
    expect(world.settings).toEqual({
      "commandCenter.background": "#123456",
      "editor.background": "#111111",
    });
    expect(world.writes).toBe(0);
  });

  it("doesn't take ownership while it isn't managing commandCenter.*, so the owner's blur still clears", async () => {
    const world = new World();
    const a = world.window("A", "#e0620b");
    const plain = world.window("P", undefined);
    world.lagging.add("P"); // A just applied its first color; P hasn't seen that yet
    a.setFocused(true);
    await settle();
    a.setFocused(false);
    plain.setFocused(true);
    await vi.advanceTimersByTimeAsync(BLUR_DEBOUNCE_MS + VERIFY_DELAY_MS);
    expect(world.owner).toBe("A");
    expect(world.settings).toEqual({ "editor.background": "#111111" });
  });

  it("doesn't clear hand-set colors on blur when its first apply failed", async () => {
    const world = new World();
    world.applied = false;
    world.settings = { "commandCenter.background": "#123456" };
    world.failWrites = true;
    const a = world.window("A", "#e0620b");
    a.setFocused(true);
    await settle();
    world.failWrites = false;
    a.setFocused(false);
    await vi.advanceTimersByTimeAsync(BLUR_DEBOUNCE_MS);
    expect(world.owner).toBe("A");
    expect(world.settings).toEqual({ "commandCenter.background": "#123456" });
  });

  it("records Toucan's colors already in settings as applied, so its blur still clears them", async () => {
    // A reinstall wiped globalState, but settings.json still has Toucan's colors.
    const world = new World();
    world.applied = false;
    world.settings = { "editor.background": "#111111", ...applied("#e0620b") };
    const a = world.window("A", "#e0620b");
    const plain = world.window("P", undefined);
    a.setFocused(true);
    await settle();
    expect(world.writes).toBe(0);
    expect(world.markAppliedCalls).toBe(1);
    a.setFocused(false);
    plain.setFocused(true);
    await vi.advanceTimersByTimeAsync(BLUR_DEBOUNCE_MS + VERIFY_DELAY_MS);
    expect(world.settings).toEqual({ "editor.background": "#111111" });
    // Recorded once: later applies don't write globalState again.
    plain.setFocused(false);
    a.setFocused(true);
    await vi.advanceTimersByTimeAsync(BLUR_DEBOUNCE_MS + VERIFY_DELAY_MS);
    expect(world.background).toBe("#e0620b");
    expect(world.markAppliedCalls).toBe(1);
  });

  it("doesn't count as applied when colorCustomizations isn't an object it can write", async () => {
    const world = new World();
    world.applied = false;
    world.settings = "#123456" as unknown as Record<string, unknown>; // a typo in settings.json
    const a = world.window("A", "#e0620b");
    a.setFocused(true);
    await settle();
    expect(world.writes).toBe(0);
    expect(world.markAppliedCalls).toBe(0);
  });

  it("warns separately when recording the first color fails, and keeps the colors", async () => {
    const world = new World();
    world.applied = false;
    world.failMarkApplied = true;
    const a = world.window("A", "#e0620b");
    a.setFocused(true);
    await settle();
    expect(world.background).toBe("#e0620b");
    expect(world.warnings).toEqual([
      "A: Couldn't record that Toucan applied a color: Error: globalState is read-only",
    ]);
  });

  it("starts managing commandCenter.* once it has applied a color", async () => {
    const world = new World();
    world.applied = false;
    const a = world.window("A", "#aa0000");
    a.setFocused(true);
    await settle();
    expect(world.applied).toBe(true);
    a.setFocused(false);
    await vi.advanceTimersByTimeAsync(BLUR_DEBOUNCE_MS);
    expect(world.settings).toEqual({ "editor.background": "#111111" });
  });

  it("applies the colors even when recording the owner fails", async () => {
    const world = new World();
    const a = new FocusCoordinator({
      id: "A",
      ports: {
        hasApplied: () => true,
        markApplied: async () => {},
        readOwner: async () => undefined,
        writeOwner: async () => {
          throw new Error("EPERM");
        },
        readCustomizations: () => world.settings,
        readCustomizationsFromDisk: async () => ({ value: world.settings }),
        writeCustomizations: async (update) => {
          const next = update(world.settings);
          if (next) {
            world.settings = next.value;
          }
        },
        warn: (message) => world.warnings.push(message),
        debug: () => {},
      },
      desired: () => commandCenterColors("#aa0000"),
    });
    a.setFocused(true);
    await settle();
    expect(world.background).toBe("#aa0000");
    expect(world.warnings).toEqual([
      "Couldn't record this window as the color owner: Error: EPERM",
    ]);
  });

  it("rewrites when the file lost the whole setting but the view still shows the colors", async () => {
    const world = new World();
    world.settings = { "editor.background": "#111111", ...applied("#aa0000") };
    world.disk = { value: undefined }; // another window's clear removed the setting
    const a = world.window("A", "#aa0000");
    a.setFocused(true);
    await settle();
    expect(world.writes).toBe(1);
  });

  it("rewrites again when a file that had converged goes stale again", async () => {
    const world = new World();
    world.settings = { ...applied("#aa0000") };
    world.disk = { value: {} };
    const a = world.window("A", "#aa0000");
    a.setFocused(true);
    await settle();
    expect(world.writes).toBe(1);
    world.disk = "same"; // converged
    a.customizationsChanged();
    await settle();
    world.disk = { value: {} }; // the same stale state as before
    a.customizationsChanged();
    await settle();
    expect(world.writes).toBe(2);
  });

  it("forgets the stale snapshot after a real change, so the same stale state rewrites again", async () => {
    const world = new World();
    let background = "#aa0000";
    world.settings = { ...applied("#aa0000") };
    world.disk = { value: {} };
    const a = world.window("A", () => background);
    a.setFocused(true);
    await settle();
    expect(world.writes).toBe(1); // stale rewrite, snapshot {} remembered
    background = "#00bb00"; // a real change
    a.refresh();
    await settle();
    expect(world.writes).toBe(2);
    background = "#aa0000";
    world.settings = { ...applied("#aa0000") };
    world.disk = { value: {} }; // the same stale state as the first time
    a.customizationsChanged();
    await settle();
    expect(world.writes).toBe(3);
  });

  it("keeps the color when two windows of the same repo hand over", async () => {
    const world = new World();
    const a = world.window("A", "#aa0000");
    const b = world.window("B", "#aa0000");
    a.setFocused(true);
    await settle();
    a.setFocused(false);
    b.setFocused(true);
    await vi.advanceTimersByTimeAsync(BLUR_DEBOUNCE_MS * 4);
    expect(world.background).toBe("#aa0000");
    expect(world.writes).toBe(1);
  });

  it("clears leftovers when an unconfigured repo's window takes focus", async () => {
    const world = new World();
    world.settings = { ...world.settings, "commandCenter.background": "#crash0" };
    world.owner = "crashed-window";
    const plain = world.window("P", undefined);
    plain.setFocused(true);
    await settle();
    expect(world.settings).toEqual({ "editor.background": "#111111" });
  });

  it("never writes from a window that starts unfocused", async () => {
    const world = new World();
    world.settings = { "commandCenter.background": "#live00" };
    world.owner = "live-window";
    const a = world.window("A", "#aa0000");
    a.setFocused(false);
    a.refresh();
    await vi.advanceTimersByTimeAsync(VERIFY_DELAY_MS * 2);
    expect(world.writes).toBe(0);
    expect(world.background).toBe("#live00");
  });

  it("self-heals when a racing blur from another window wipes the colors", async () => {
    const world = new World();
    const b = world.window("B", "#0000bb");
    b.setFocused(true);
    await settle();
    // A's clear landed after B's write: B still owns, but its keys are gone.
    world.settings = { "editor.background": "#111111" };
    await vi.advanceTimersByTimeAsync(VERIFY_DELAY_MS);
    expect(world.background).toBe("#0000bb");
  });

  it("rewrites when the file shows the view is stale", async () => {
    const world = new World();
    const a = world.window("A", "#aa0000");
    const b = world.window("B", "#aa0000");
    a.setFocused(true);
    await settle();
    // A new window opens: A blurs and clears before B starts.
    a.setFocused(false);
    await vi.advanceTimersByTimeAsync(BLUR_DEBOUNCE_MS);
    const cleared = world.settings;
    // B's view missed the clear and still shows the colors; the file doesn't.
    world.settings = { ...cleared, ...applied("#aa0000") };
    world.disk = { value: cleared };
    b.setFocused(true);
    await settle();
    expect(world.writes).toBe(3);
    expect(world.background).toBe("#aa0000");
  });

  it("re-applies when a change event reveals missing colors", async () => {
    const world = new World();
    const b = world.window("B", "#aa0000");
    b.setFocused(true);
    await settle();
    world.settings = { "editor.background": "#111111" };
    b.customizationsChanged();
    await settle();
    expect(world.background).toBe("#aa0000");
  });

  it("never writes another profile's keys from a wrong settings file (H1)", async () => {
    const world = new World();
    world.settings = { "editor.background": "#111111", ...applied("#aa0000") };
    // The guessed file belongs to another profile.
    world.disk = { value: { "editor.background": "#ffffff", "[Other Theme]": {} } };
    const a = world.window("A", "#aa0000");
    a.setFocused(true);
    await settle();
    expect(world.settings).toEqual({ "editor.background": "#111111", ...applied("#aa0000") });
  });

  it("rewrites at most once for a file that persistently differs", async () => {
    const world = new World();
    world.settings = { ...applied("#aa0000") };
    world.disk = { value: { "editor.background": "#ffffff" } };
    const a = world.window("A", "#aa0000");
    a.setFocused(true);
    await vi.advanceTimersByTimeAsync(VERIFY_DELAY_MS);
    for (let index = 0; index < 5; index++) {
      a.customizationsChanged();
      a.refresh();
    }
    await vi.advanceTimersByTimeAsync(VERIFY_DELAY_MS);
    expect(world.writes).toBe(1);
    // A new file state may be a real change, so it gets one more rewrite.
    world.disk = { value: { "editor.background": "#000000" } };
    a.customizationsChanged();
    await settle();
    expect(world.writes).toBe(2);
  });

  it("relies on the view when the file can't be read", async () => {
    const world = new World();
    world.disk = "unreadable";
    const a = world.window("A", "#aa0000");
    a.setFocused(true);
    await vi.advanceTimersByTimeAsync(VERIFY_DELAY_MS);
    expect(world.writes).toBe(1);
    expect(world.background).toBe("#aa0000");
  });

  it("never writes over a malformed view, even when the file differs", async () => {
    const world = new World();
    (world as { settings: unknown }).settings = "oops";
    world.disk = { value: {} };
    const a = world.window("A", "#aa0000");
    a.setFocused(true);
    await settle();
    expect(world.writes).toBe(0);
  });

  it("ignores customization changes in unfocused windows and non-owners", async () => {
    const world = new World();
    const a = world.window("A", "#aa0000");
    a.customizationsChanged();
    await settle();
    expect(world.writes).toBe(0);
    a.setFocused(true);
    await settle();
    world.owner = "B";
    world.settings = {};
    a.customizationsChanged();
    await settle();
    expect(world.settings).toEqual({});
  });

  it("doesn't re-apply in the self-heal check after losing ownership", async () => {
    const world = new World();
    const b = world.window("B", "#0000bb");
    b.setFocused(true);
    await settle();
    world.owner = "C";
    world.settings = {};
    await vi.advanceTimersByTimeAsync(VERIFY_DELAY_MS);
    expect(world.settings).toEqual({});
  });

  it("re-applies on refresh while focused", async () => {
    const world = new World();
    let background = "#aa0000";
    const a = world.window("A", () => background);
    a.setFocused(true);
    await settle();
    background = "#00aa00";
    a.refresh();
    await settle();
    expect(world.background).toBe("#00aa00");
  });

  it("logs a write failure once per streak and recovers", async () => {
    const world = new World();
    world.failWrites = true;
    const a = world.window("A", "#aa0000");
    a.setFocused(true);
    await settle();
    a.refresh();
    await vi.advanceTimersByTimeAsync(VERIFY_DELAY_MS);
    expect(world.warnings).toHaveLength(1);
    world.failWrites = false;
    a.refresh();
    await settle();
    expect(world.background).toBe("#aa0000");
  });

  it("logs a new failure streak after a write succeeded in between", async () => {
    const world = new World();
    let background = "#aa0000";
    const a = world.window("A", () => background);
    world.failWrites = true;
    a.setFocused(true);
    await settle();
    world.failWrites = false;
    a.refresh();
    await settle();
    expect(world.background).toBe("#aa0000");
    world.failWrites = true;
    background = "#00aa00";
    a.refresh();
    await settle();
    expect(world.warnings).toHaveLength(2);
  });

  it("clears on dispose only while it owns the colors", async () => {
    const world = new World();
    const a = world.window("A", "#aa0000");
    a.setFocused(true);
    await settle();
    await a.dispose();
    expect(world.background).toBeUndefined();

    const b = world.window("B", "#0000bb");
    b.setFocused(true);
    await settle();
    world.owner = "C";
    await b.dispose();
    expect(world.background).toBe("#0000bb");
  });

  it("logs a task that fails outside its own error handling", async () => {
    const warnings: string[] = [];
    const a = new FocusCoordinator({
      id: "A",
      ports: {
        hasApplied: () => true,
        markApplied: async () => {},
        // dispose() reads the owner before clearing; nothing in that task catches this.
        readOwner: async () => {
          throw new Error("owner file locked");
        },
        writeOwner: async () => {},
        readCustomizations: () => undefined,
        readCustomizationsFromDisk: async () => undefined,
        writeCustomizations: async () => {},
        warn: (message) => warnings.push(message),
        debug: () => {},
      },
      desired: () => undefined,
    });
    await a.dispose();
    expect(warnings).toEqual(["Focus handling failed: Error: owner file locked"]);
  });

  it("never rejects, even when logging a failure throws", async () => {
    const a = new FocusCoordinator({
      id: "A",
      ports: {
        hasApplied: () => true,
        markApplied: async () => {},
        readOwner: async () => "A",
        writeOwner: async () => {},
        readCustomizations: () => ({ "commandCenter.background": "#aa0000" }),
        readCustomizationsFromDisk: async () => undefined,
        writeCustomizations: async () => {
          throw new Error("shutting down");
        },
        warn: () => {
          throw new Error("Channel has been closed");
        },
        debug: () => {},
      },
      desired: () => undefined,
    });
    await expect(a.dispose()).resolves.toBeUndefined();
  });

  it("treats an unreadable owner as someone else's", async () => {
    const world = new World();
    const a = world.window("A", "#aa0000");
    a.setFocused(true);
    await settle();
    world.owner = undefined;
    a.setFocused(false);
    await vi.advanceTimersByTimeAsync(BLUR_DEBOUNCE_MS);
    expect(world.background).toBe("#aa0000");
  });
});
