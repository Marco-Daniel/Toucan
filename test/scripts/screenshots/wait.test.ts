// import libraries
import { describe, expect, it } from "vitest";

// import utils
import { POLL_MS, waitFor } from "../../../scripts/screenshots/wait.mts";

/** A fake clock that only moves when the wait sleeps, and logs every sleep. */
function clock() {
  const world = { now: 1000, sleeps: [] as number[] };
  const ports = {
    now: () => world.now,
    sleep: async (ms: number) => {
      world.sleeps.push(ms);
      world.now += ms;
    },
  };
  return { world, ports };
}

describe("waitFor", () => {
  it("returns the first defined value, polling until then", async () => {
    const { world, ports } = clock();
    const answers = [undefined, undefined, "ready"];
    const value = await waitFor({
      what: "the window",
      check: async () => answers.shift(),
      timeoutMs: 1000,
      ports,
    });
    expect(value).toBe("ready");
    expect(world.sleeps).toEqual([POLL_MS, POLL_MS]);
  });

  it("checks once more at the deadline, then names what it waited for", async () => {
    const { world, ports } = clock();
    let checks = 0;
    await expect(
      waitFor({
        what: "the Set Color input",
        check: async () => {
          checks++;
          return undefined;
        },
        timeoutMs: 250,
        ports,
      }),
    ).rejects.toThrow("Timed out after 250 ms waiting for the Set Color input");
    expect([checks, world.now]).toEqual([4, 1300]);
  });

  it("gives up exactly at the deadline", async () => {
    const { ports } = clock();
    let checks = 0;
    const check = async () => {
      checks++;
      return undefined;
    };
    await expect(waitFor({ what: "x", check, timeoutMs: 200, ports })).rejects.toThrow(
      "Timed out after 200 ms waiting for x",
    );
    // At 0, 100 and 200 ms; the check at the deadline is the last.
    expect(checks).toBe(3);
  });

  it("waits on the real clock by default, a poll apart", async () => {
    const answers = [undefined, "ready"];
    const started = Date.now();
    expect(await waitFor({ what: "x", check: async () => answers.shift(), timeoutMs: 5000 })).toBe(
      "ready",
    );
    expect(Date.now() - started).toBeGreaterThanOrEqual(POLL_MS - 5);
  });

  it("gives up on the real clock too", async () => {
    await expect(
      waitFor({ what: "nothing", check: async () => undefined, timeoutMs: 0 }),
    ).rejects.toThrow("Timed out after 0 ms waiting for nothing");
  });

  it("returns a falsy value that isn't undefined", async () => {
    const { ports } = clock();
    expect(await waitFor({ what: "x", check: async () => 0, timeoutMs: 0, ports })).toBe(0);
  });
});
