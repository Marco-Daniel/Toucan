// A minimal Chrome DevTools protocol client for the screenshots script: one
// page target over its WebSocket, and JavaScript evaluated in that page.
// import utils
import { isRecord } from "../../extension/src/shared/records/records.util.ts";

export interface Cdp {
  send: (method: string, params?: Record<string, unknown>) => Promise<Record<string, unknown>>;
  close: () => void;
}

/** A minimal DevTools protocol client for one page target. */
export async function connect(url: string): Promise<Cdp> {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => {
    socket.addEventListener("open", resolve, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let nextId = 0;
  const pending = new Map<number, (message: Record<string, unknown>) => void>();
  socket.addEventListener("message", (event) => {
    const message: unknown = JSON.parse(String(event.data));
    // Only answers to our own requests: an id this script issued, with its own callback.
    const id = isRecord(message) ? message["id"] : undefined;
    const settle = typeof id === "number" ? pending.get(id) : undefined;
    if (isRecord(message) && typeof id === "number" && typeof settle === "function") {
      pending.delete(id);
      settle(message);
    }
  });
  return {
    send: (method, params = {}) =>
      new Promise((resolve, reject) => {
        nextId++;
        pending.set(nextId, (message) => {
          const { error, result } = message;
          if (isRecord(error)) {
            reject(new Error(`${method}: ${String(error["message"])}`));
          } else {
            resolve(isRecord(result) ? result : {});
          }
        });
        socket.send(JSON.stringify({ id: nextId, method, params }));
      }),
    close: () => socket.close(),
  };
}

/** Runs JavaScript in the page and returns its JSON-serialisable value. */
export async function evaluate(cdp: Cdp, expression: string): Promise<unknown> {
  const { result } = await cdp.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  return isRecord(result) ? result["value"] : undefined;
}
