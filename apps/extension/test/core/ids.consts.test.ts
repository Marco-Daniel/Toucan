// import libraries
import { describe, expect, it } from "vitest";

// import consts
import { STATUS_ITEM_ID } from "../../src/core/ids.consts.ts";

describe("STATUS_ITEM_ID", () => {
  it("stays toucan.indicator, the id VS Code keeps the user's hide and position under", () => {
    expect(STATUS_ITEM_ID).toBe("toucan.indicator");
  });
});
