// A minimal Chrome DevTools protocol client for the README screenshot script:
// one WebSocket session per target (a VS Code window, or Electron's main
// process through --inspect), request and response by id.
// import utils
import { tryCatchSync } from "../../src/shared/async/tryCatch.util.ts";
import { isRecord } from "../../src/shared/records/records.util.ts";

/** How long one DevTools request or connection attempt may take. */
const REQUEST_TIMEOUT_MS = 5000;

/** A DevTools target as `/json/list` describes it. */
export interface Target {
  type: string;
  title: string;
  url: string;
  webSocketDebuggerUrl: string;
}

/** The targets a DevTools port serves. */
export async function listTargets(port: number): Promise<Target[]> {
  const response = await fetch(`http://127.0.0.1:${port}/json/list`, {
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  const body: unknown = await response.json();
  return Array.isArray(body) ? body.filter(isTarget) : [];
}

function isTarget(value: unknown): value is Target {
  return (
    isRecord(value) &&
    typeof value["type"] === "string" &&
    typeof value["title"] === "string" &&
    typeof value["url"] === "string" &&
    typeof value["webSocketDebuggerUrl"] === "string"
  );
}

interface Pending {
  resolve: (result: unknown) => void;
  reject: (error: Error) => void;
}

export class DevToolsSession {
  private nextId = 1;
  private readonly pending = new Map<number, Pending>();
  private readonly socket: WebSocket;

  private constructor(socket: WebSocket) {
    this.socket = socket;
    socket.addEventListener("message", (event) => this.receive(event));
    // VS Code went away: nothing will answer the calls still waiting.
    socket.addEventListener("close", () => this.close());
  }

  static async connect(url: string): Promise<DevToolsSession> {
    const socket = new WebSocket(url);
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        socket.close();
        reject(new Error(`Timed out connecting to ${url}`));
      }, REQUEST_TIMEOUT_MS);
      socket.addEventListener(
        "open",
        () => {
          clearTimeout(timer);
          resolve();
        },
        { once: true },
      );
      socket.addEventListener("error", () => reject(new Error(`Can't connect to ${url}`)), {
        once: true,
      });
    });
    return new DevToolsSession(socket);
  }

  /** A protocol call's result; rejects with the protocol's error message. */
  async send(method: string, params: Record<string, unknown> = {}): Promise<unknown> {
    const id = this.nextId++;
    const result = new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`${method} got no answer within ${REQUEST_TIMEOUT_MS} ms`));
      }, REQUEST_TIMEOUT_MS);
      this.pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
    });
    this.socket.send(JSON.stringify({ id, method, params }));
    return result;
  }

  /** A JavaScript expression's value in the target, awaited and returned by value. */
  async evaluate(expression: string): Promise<unknown> {
    const reply = await this.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
      includeCommandLineAPI: true,
    });
    if (isRecord(reply) && isRecord(reply["exceptionDetails"])) {
      throw new Error(`Evaluating failed: ${JSON.stringify(reply["exceptionDetails"])}`);
    }
    return isRecord(reply) && isRecord(reply["result"]) ? reply["result"]["value"] : undefined;
  }

  /** Closes the connection; calls still waiting for an answer reject. */
  close(): void {
    this.socket.close();
    for (const { reject } of this.pending.values()) {
      reject(new Error("The DevTools connection closed"));
    }
    this.pending.clear();
  }

  private receive(event: MessageEvent): void {
    // A message that isn't JSON answers no request; ignore it rather than throw in the listener.
    const [message] = tryCatchSync((): unknown => JSON.parse(String(event.data)));
    if (!isRecord(message) || typeof message["id"] !== "number") {
      return;
    }
    const pending = this.pending.get(message["id"]);
    this.pending.delete(message["id"]);
    if (isRecord(message["error"])) {
      pending?.reject(new Error(String(message["error"]["message"])));
    } else {
      pending?.resolve(message["result"]);
    }
  }
}
