// import libraries
import { describe, expect, it } from "vitest";

// import utils
import { errorText, tryCatch, tryCatchSync } from "../../../src/shared/async/tryCatch.util.ts";

describe("tryCatch", () => {
  it("gives the value and no error when the promise resolves", async () => {
    expect(await tryCatch(() => Promise.resolve("saved"))).toEqual(["saved", null]);
  });

  it("gives the rejection itself as the error", async () => {
    const failure = new Error("read-only");
    const [data, error] = await tryCatch(() => Promise.reject(failure));
    expect(data).toBeNull();
    expect(error).toBe(failure);
  });

  it("keeps a rejection that isn't an Error as it is", async () => {
    expect(await tryCatch(() => Promise.reject("busy"))).toEqual([null, "busy"]);
  });

  it("never reports a rejection with null as success", async () => {
    const [, error] = await tryCatch(() => Promise.reject(null));
    expect(error).toEqual(new Error("null was thrown"));
  });

  it("never reports a rejection with undefined as no error", async () => {
    const [, error] = await tryCatch(() => Promise.reject(undefined));
    expect(error).toEqual(new Error("undefined was thrown"));
  });

  it("catches a synchronous throw while starting the work", async () => {
    const failure = new Error("bad path");
    const [data, error] = await tryCatch((): Promise<string> => {
      throw failure;
    });
    expect(data).toBeNull();
    expect(error).toBe(failure);
  });

  it("reports a value of null as success", async () => {
    expect(await tryCatch(() => Promise.resolve(null))).toEqual([null, null]);
  });
});

describe("tryCatchSync", () => {
  it("gives the return value and no error", () => {
    expect(tryCatchSync(() => 42)).toEqual([42, null]);
  });

  it("catches what the function throws", () => {
    const failure = new Error("bad JSON");
    const [data, error] = tryCatchSync(() => {
      throw failure;
    });
    expect(data).toBeNull();
    expect(error).toBe(failure);
  });

  it("never reports a throw of null as success", () => {
    const [, error] = tryCatchSync(() => {
      throw null;
    });
    expect(error).toEqual(new Error("null was thrown"));
  });
});

describe("errorText", () => {
  it("shows an error the way String() does", () => {
    expect(errorText(new Error("EACCES"))).toBe("Error: EACCES");
  });
});
