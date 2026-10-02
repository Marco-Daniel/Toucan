// import libraries
import { describe, expect, it } from "vitest";

// import utils
import { createLock } from "../../../src/shared/async/lock.util.ts";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("createLock", () => {
  it("never overlaps two tasks, even when the first is slower", async () => {
    const lock = createLock();
    const events: string[] = [];
    interface TaskArgs {
      name: string;
      steps: number;
    }
    const task =
      ({ name, steps }: TaskArgs) =>
      async () => {
        events.push(`${name} start`);
        await delay(steps);
        events.push(`${name} end`);
        return name;
      };
    const results = await Promise.all([
      lock(task({ name: "colors", steps: 5 })),
      lock(task({ name: "repos", steps: 1 })),
    ]);
    expect(results).toEqual(["colors", "repos"]);
    expect(events).toEqual(["colors start", "colors end", "repos start", "repos end"]);
  });

  it("keeps going after a failing task and reports the error to its caller", async () => {
    const lock = createLock();
    const failing = lock(async () => {
      throw new Error("write failed");
    });
    const next = lock(async () => "next");
    await expect(failing).rejects.toThrow("write failed");
    await expect(next).resolves.toBe("next");
  });
});
