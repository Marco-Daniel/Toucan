/**
 * The outcome of work that may fail, as a tuple: `[data, null]` when it
 * succeeded, `[null, error]` when it threw or rejected. Check the error, not
 * the data: data can itself be null.
 */
export type Result<T> = readonly [data: T, error: null] | readonly [data: null, error: unknown];

/** Awaits `promise`, turning a rejection into the error half of a Result. */
export async function tryCatch<T>(promise: PromiseLike<T>): Promise<Result<T>> {
  try {
    return [await promise, null];
  } catch (error) {
    return [null, nonNull(error)];
  }
}

/** Calls `run`, turning a throw into the error half of a Result. */
export function tryCatchSync<T>(run: () => T): Result<T> {
  try {
    return [run(), null];
  } catch (error) {
    return [null, nonNull(error)];
  }
}

/** A thrown `null` would read as success, so it becomes an Error. */
function nonNull(error: unknown): unknown {
  return error === null ? new Error("null was thrown") : error;
}
