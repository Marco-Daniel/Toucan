// import libraries
import { describe, expect, it } from "vitest";

// import utils
import { logFailure } from "../../../src/shared/async/logFailure.util.ts";

describe("logFailure", () => {
  it("warns with what failed and the error", () => {
    const warnings: string[] = [];
    logFailure({
      log: { warn: (message) => warnings.push(message) },
      what: "Revealing the block",
      error: new Error("view not registered"),
    });
    expect(warnings).toEqual(["Revealing the block failed: Error: view not registered"]);
  });
});
