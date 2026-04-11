import { spawn } from "node:child_process";
import { createInterface } from "node:readline";

import type { JsonObject } from "./types.js";

export class CodexAppServerClient {
  readonly #command: readonly string[];
  #child: ReturnType<typeof spawn> | null = null;
  #nextId = 1;
  #pending = new Map<
    number,
    { resolve: (value: JsonObject) => void; reject: (error: unknown) => void }
  >();
  #queue: JsonObject[] = [];
  #waiters: Array<(value: JsonObject) => void> = [];

  constructor(command: readonly string[] = ["codex", "app-server"]) {
    this.#command = command;
  }

  async start(): Promise<void> {
    const [bin, ...args] = this.#command;
    this.#child = spawn(bin ?? "codex", args, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.#child.once("error", (error) => {
      this.#rejectAll(error);
    });

    const stdout = this.#child.stdout;
    const stderr = this.#child.stderr;
    if (!stdout || !stderr || !this.#child.stdin) {
      throw new Error("Failed to start codex app-server stdio streams.");
    }

    createInterface({ input: stdout }).on("line", (line) => {
      const message = JSON.parse(line) as JsonObject;
      if ("method" in message) {
        this.#enqueue(message);
        return;
      }
      const responseId = message.id;
      if (typeof responseId !== "number") {
        return;
      }
      const pending = this.#pending.get(responseId);
      if (!pending) {
        return;
      }
      this.#pending.delete(responseId);
      pending.resolve(message);
    });

    createInterface({ input: stderr }).on("line", (line) => {
      console.error(`[codex-anywhere stderr] ${line}`);
    });
  }

  async initialize(): Promise<void> {
    await this.call("initialize", {
      clientInfo: {
        name: "codex-anywhere",
        title: "Codex Anywhere",
        version: "0.1.0",
      },
      capabilities: {
        experimentalApi: true,
      },
    });
    await this.notify("initialized");
  }

  async call(method: string, params?: JsonObject): Promise<JsonObject> {
    const requestId = this.#nextId;
    this.#nextId += 1;
    const result = await new Promise<JsonObject>((resolve, reject) => {
      this.#pending.set(requestId, { resolve, reject });
      void this.#send({ id: requestId, method, ...(params ? { params } : {}) }).catch(reject);
    });

    if ("error" in result) {
      throw new Error(JSON.stringify(result.error));
    }
    return (result.result as JsonObject | undefined) ?? {};
  }

  async notify(method: string, params?: JsonObject): Promise<void> {
    await this.#send({ method, ...(params ? { params } : {}) });
  }

  async respond(requestId: string | number, result: JsonObject): Promise<void> {
    await this.#send({ id: requestId, result });
  }

  async nextMessage(): Promise<JsonObject> {
    const queued = this.#queue.shift();
    if (queued) {
      return queued;
    }
    return await new Promise<JsonObject>((resolve) => {
      this.#waiters.push(resolve);
    });
  }

  async close(): Promise<void> {
    if (!this.#child) {
      return;
    }
    this.#child.kill();
    this.#child = null;
  }

  async #send(payload: JsonObject): Promise<void> {
    if (!this.#child?.stdin) {
      throw new Error("codex app-server is not running.");
    }
    this.#child.stdin.write(`${JSON.stringify(payload)}\n`);
  }

  #enqueue(message: JsonObject): void {
    const waiter = this.#waiters.shift();
    if (waiter) {
      waiter(message);
      return;
    }
    this.#queue.push(message);
  }

  #rejectAll(error: unknown): void {
    for (const pending of this.#pending.values()) {
      pending.reject(error);
    }
    this.#pending.clear();
  }
}
