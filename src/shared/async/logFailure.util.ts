import { errorText } from "./tryCatch.util.ts";

/** Anything that logs warnings: the output channel, or a port that forwards to it. */
export interface WarningLog {
  warn(message: string): void;
}

interface LogFailureArgs {
  log: WarningLog;
  /** What was attempted, e.g. "Revealing the block". */
  what: string;
  error: unknown;
}

/** Logs a failed background step as "<what> failed: <error>". */
export function logFailure({ log, what, error }: LogFailureArgs): void {
  log.warn(`${what} failed: ${errorText(error)}`);
}
