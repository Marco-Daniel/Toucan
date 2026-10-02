/**
 * Runs tasks one at a time, in call order. A failing task doesn't block the
 * ones after it; its error goes to its own caller.
 */
export function createLock(): <T>(task: () => Promise<T>) => Promise<T> {
  let tail: Promise<unknown> = Promise.resolve();
  return (task) => {
    const run = tail.then(task, task);
    // A .catch, not tryCatch: the tail is a chain the next task waits on, never awaited here.
    tail = run.catch(() => undefined);
    return run;
  };
}
