// import libraries
import { afterEach, beforeEach, describe, expect, it } from "vitest";

// import utils
import { handOff } from "../../../src/shared/async/handOff.util.ts";

/** Waits one macrotask: past the hand-off settling and past Node's unhandled-rejection check. */
async function nextMacrotask(): Promise<void> {
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

describe("handOff", () => {
  const unhandled: unknown[] = [];
  const recordUnhandled = (reason: unknown): void => {
    unhandled.push(reason);
  };

  beforeEach(() => {
    unhandled.length = 0;
    process.on("unhandledRejection", recordUnhandled);
  });

  afterEach(() => {
    process.off("unhandledRejection", recordUnhandled);
  });

  it("logs a task that rejects, and leaves no unhandled rejection", async () => {
    const warnings: string[] = [];
    handOff({
      log: { warn: (message) => warnings.push(message) },
      what: "Revealing the block",
      task: () => Promise.reject(new Error("view not registered")),
    });
    await nextMacrotask();
    expect(warnings).toEqual(["Revealing the block failed: Error: view not registered"]);
    expect(unhandled).toEqual([]);
  });

  it("runs a task that succeeds and logs nothing", async () => {
    const warnings: string[] = [];
    let runs = 0;
    handOff({
      log: { warn: (message) => warnings.push(message) },
      what: "Revealing the block",
      task: async () => {
        runs += 1;
      },
    });
    await nextMacrotask();
    expect(runs).toBe(1);
    expect(warnings).toEqual([]);
  });

  it("leaves no unhandled rejection when the log itself throws", async () => {
    let attempts = 0;
    handOff({
      log: {
        warn: () => {
          attempts += 1;
          throw new Error("output channel closed");
        },
      },
      what: "Focus handling",
      task: () => Promise.reject(new Error("settings.json is dirty")),
    });
    await nextMacrotask();
    expect(attempts).toBe(1);
    expect(unhandled).toEqual([]);
  });
});
