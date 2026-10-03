/** Anything that was thrown, except null and undefined (those become an Error). */
// oxlint-disable-next-line typescript/no-generated-empty-object-type -- `{}` is meant: any value but null or undefined, which lets a Result narrow on its error
export type Thrown = NonNullable<unknown>;

/**
 * The outcome of work that may fail, as a tuple: `[data, null]` when it
 * succeeded, `[null, error]` when it threw or rejected. Check the error, not
 * the data: data can itself be null. Once the error is known to be null,
 * TypeScript knows the data is the value.
 */
export type Result<T> = readonly [data: T, error: null] | readonly [data: null, error: Thrown];

/**
 * Starts and awaits `run`, turning a throw or a rejection into the error half
 * of a Result. It takes the work, not a promise, so a synchronous throw while
 * starting it is caught too.
 */
export async function tryCatch<T>(run: () => PromiseLike<T>): Promise<Result<T>> {
  try {
    return [await run(), null];
  } catch (error) {
    return [null, thrown(error)];
  }
}

/** Calls `run`, turning a throw into the error half of a Result. */
export function tryCatchSync<T>(run: () => T): Result<T> {
  try {
    return [run(), null];
  } catch (error) {
    return [null, thrown(error)];
  }
}

/**
 * The error as text for a message, the way `String()` shows it. A Result's
 * error is typed `{}`, and String() on that trips no-base-to-string.
 */
export function errorText(error: unknown): string {
  return String(error);
}

/** A thrown `null` would read as success and `undefined` as nothing, so both become an Error. */
function thrown(error: unknown): Thrown {
  return error ?? new Error(`${String(error)} was thrown`);
}
