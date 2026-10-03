// Waiting on VS Code's state for the README screenshot script: poll a
// condition until it holds or a deadline passes, never a blind sleep.

/** How often a condition is checked. */
export const POLL_MS = 100;

export interface WaitPorts {
  now(): number;
  sleep(ms: number): Promise<void>;
}

interface WaitForArgs<T> {
  /** What is awaited, for the error message. */
  what: string;
  /** The value once the condition holds, else `undefined`. */
  check: () => Promise<T | undefined>;
  timeoutMs: number;
  ports?: WaitPorts;
}

const REAL: WaitPorts = {
  now: () => Date.now(),
  sleep: async (ms) => {
    await new Promise((resolve) => setTimeout(resolve, ms));
  },
};

/** The check's first defined value; throws once `timeoutMs` passes without one. */
export async function waitFor<T>({
  what,
  check,
  timeoutMs,
  ports = REAL,
}: WaitForArgs<T>): Promise<T> {
  const deadline = ports.now() + timeoutMs;
  for (;;) {
    const value = await check();
    if (value !== undefined) {
      return value;
    }
    if (ports.now() >= deadline) {
      throw new Error(`Timed out after ${timeoutMs} ms waiting for ${what}`);
    }
    await ports.sleep(POLL_MS);
  }
}
