// A minimal Chrome DevTools protocol client for the README screenshot script:
// one WebSocket session per target (a VS Code window, or Electron's main
// process through --inspect), request and response by id.
// import utils
import { isRecord } from "../../src/shared/records/records.util.ts";

/** A DevTools target as `/json/list` describes it. */
export interface Target {
  type: string;
  title: string;
  url: string;
  webSocketDebuggerUrl: string;
}

/** The targets a DevTools port serves. */
export async function listTargets(port: number): Promise<Target[]> {
  const response = await fetch(`http://127.0.0.1:${port}/json/list`);
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
  }

  static async connect(url: string): Promise<DevToolsSession> {
    const socket = new WebSocket(url);
    await new Promise<void>((resolve, reject) => {
      socket.addEventListener("open", () => resolve(), { once: true });
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
      this.pending.set(id, { resolve, reject });
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

  close(): void {
    this.socket.close();
  }

  private receive(event: MessageEvent): void {
    const message: unknown = JSON.parse(String(event.data));
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
