import { window } from "vscode";
import type { Disposable } from "vscode";

/** Toucan's log. Never throws, so it's safe to use during shutdown. */
export interface Log {
  debug(message: string): void;
  info(message: string): void;
  warn(message: string): void;
}

/**
 * The "Toucan" output channel behind a guard: during shutdown the channel can
 * already be closed when a last message comes in (deactivate's best-effort
 * clear, a late timer), and logging must never fail the caller.
 */
export function createLog(): Log & Disposable {
  const channel = window.createOutputChannel("Toucan", { log: true });
  return {
    debug: guarded((message) => channel.debug(message)),
    info: guarded((message) => channel.info(message)),
    warn: guarded((message) => channel.warn(message)),
    dispose: () => channel.dispose(),
  };
}

function guarded(write: (message: string) => void): (message: string) => void {
  return (message) => {
    try {
      write(message);
    } catch {
      // The channel is gone; there's nobody left to read the message.
    }
  };
}
