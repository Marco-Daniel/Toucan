// import utils
import { tryCatch, tryCatchSync } from "./tryCatch.util.ts";
import { logFailure } from "./logFailure.util.ts";

// import types
import type { WarningLog } from "./logFailure.util.ts";

interface HandOffArgs {
  log: WarningLog;
  /** What the work is, for the warning when it fails, e.g. "Revealing the block". */
  what: string;
  task: () => Promise<void>;
}

/**
 * Starts work from a sync event handler or timer, which has no caller to
 * await it. A failure is logged as "<what> failed: <error>", never left as an
 * unhandled rejection.
 */
export function handOff(args: HandOffArgs): void {
  // oxlint-disable-next-line typescript/no-floating-promises -- no caller to await (see above); settle never rejects
  settle(args);
}

async function settle({ log, what, task }: HandOffArgs): Promise<void> {
  const [, error] = await tryCatch(task);
  if (error !== null) {
    // Logging can fail during shutdown; settle must still not reject.
    tryCatchSync(() => logFailure({ log, what, error }));
  }
}
