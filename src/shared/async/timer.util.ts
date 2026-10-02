interface TimerStartArgs {
  ms: number;
  run: () => void;
}

/** A one-shot timer that runs at most one pending callback at a time. */
export interface Timer {
  /** Runs `run` after `ms`, replacing a run that's still pending. */
  start(args: TimerStartArgs): void;
  /** Drops the pending run, if there is one. */
  cancel(): void;
}

export function createTimer(): Timer {
  let handle: ReturnType<typeof setTimeout> | undefined;
  const cancel = (): void => {
    if (handle !== undefined) {
      clearTimeout(handle);
      handle = undefined;
    }
  };
  return {
    start: ({ ms, run }) => {
      cancel();
      handle = setTimeout(() => {
        handle = undefined;
        run();
      }, ms);
    },
    cancel,
  };
}
