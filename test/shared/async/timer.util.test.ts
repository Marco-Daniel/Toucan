// import libraries
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// import utils
import { createTimer } from "../../../src/shared/async/timer.util.ts";

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe("createTimer", () => {
  it("runs once, after the delay and not before", () => {
    const runs: string[] = [];
    createTimer().start({ ms: 100, run: () => runs.push("ran") });
    vi.advanceTimersByTime(99);
    expect(runs).toEqual([]);
    vi.advanceTimersByTime(1);
    vi.advanceTimersByTime(1000);
    expect(runs).toEqual(["ran"]);
  });

  it("replaces a pending run, counting the delay from the new start", () => {
    const runs: string[] = [];
    const timer = createTimer();
    timer.start({ ms: 100, run: () => runs.push("first") });
    vi.advanceTimersByTime(60);
    timer.start({ ms: 100, run: () => runs.push("second") });
    vi.advanceTimersByTime(60);
    expect(runs).toEqual([]);
    vi.advanceTimersByTime(40);
    expect(runs).toEqual(["second"]);
  });

  it("drops a pending run on cancel, and can start again after", () => {
    const runs: string[] = [];
    const timer = createTimer();
    timer.start({ ms: 100, run: () => runs.push("dropped") });
    timer.cancel();
    vi.advanceTimersByTime(200);
    timer.start({ ms: 100, run: () => runs.push("kept") });
    vi.advanceTimersByTime(100);
    expect(runs).toEqual(["kept"]);
  });
});
