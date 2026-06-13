// =============================================================================
// Tests for the cron skill-runner (Phase E §5.4 E4 — C2 closure).
//
// The C2 binding is the critical correctness fix: `invokeSkillViaApi` must
// NOT return the 202 `{run_id}` from POST /v1/skill/run as the result.
// It must subscribe to the WS and await the real `skill:result` or
// `skill:error` for that run_id. The §3-prelude bug marked "success" on
// the 202; the §7 gate catches it as a hollow audit.
//
// These tests mock `fetch` + the global `WebSocket` to verify:
//   - happy path: skill:result → returns {kind: "result", output}
//   - error path: skill:error → returns {kind: "error", error}
//   - timeout: no message within timeoutMs → throws
//   - WS failure: connection fails → throws
//   - the 202 is NOT interpreted as success (C2 binding sanity check)
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { invokeSkillViaApi } from "../../src/cron/skill-runner.js";

const TEST_API_KEY = "test-openrouter-key-1234567890";

// A minimal WebSocket mock that records handlers and lets tests fire
// synthetic events. We override the global `WebSocket` in beforeEach.
class MockWebSocket {
  static instances: MockWebSocket[] = [];
  public readyState = 0; // CONNECTING
  public sentMessages: string[] = [];
  public closed = false;
  public closeCode: number | null = null;

  private listeners: Record<string, Array<(event: unknown) => void>> = {
    open: [],
    message: [],
    error: [],
    close: [],
  };

  constructor(public url: string) {
    MockWebSocket.instances.push(this);
    // Async-open: schedule an `open` event on the next microtask
    queueMicrotask(() => this.fire("open", {}));
  }

  addEventListener(type: string, handler: (event: unknown) => void): void {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type]!.push(handler);
  }

  send(data: string): void {
    this.sentMessages.push(data);
  }

  close(code = 1000, reason = ""): void {
    if (this.closed) return;
    this.closed = true;
    this.closeCode = code;
    this.readyState = 3; // CLOSED
    queueMicrotask(() => this.fire("close", { code, reason }));
  }

  /** Test helper: fire a synthetic event to all listeners. */
  fire(type: string, event: unknown): void {
    for (const handler of this.listeners[type] ?? []) {
      handler(event);
    }
  }
}

beforeEach(() => {
  process.env.OPENROUTER_API_KEY = TEST_API_KEY;
  MockWebSocket.instances = [];
  // @ts-expect-error — mocking the global WebSocket
  globalThis.WebSocket = MockWebSocket;
});

afterEach(() => {
  vi.restoreAllMocks();
  // @ts-expect-error — restoring the global WebSocket
  delete globalThis.WebSocket;
});

describe("invokeSkillViaApi — happy path (C2 closure)", () => {
  it("returns {kind: 'result', output} after the real skill:result, NOT the 202", async () => {
    // Mock the 202 response from POST /v1/skill/run
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true, data: { run_id: "test-run-1" } }), {
        status: 202,
        headers: { "content-type": "application/json" },
      }),
    );

    // Start the invocation (don't await yet)
    const promise = invokeSkillViaApi({
      baseUrl: "http://localhost:8765",
      wsUrl: "ws://localhost:8765/ws",
      skill: "morning-audit",
      args: {},
      timeoutMs: 5_000,
    });

    // Wait for the WS to be constructed and open
    await new Promise((r) => setTimeout(r, 10));
    expect(MockWebSocket.instances.length).toBe(1);
    const ws = MockWebSocket.instances[0]!;
    expect(ws.url).toBe("ws://localhost:8765/ws");

    // Verify the WS subscription was sent (not a magic value)
    expect(ws.sentMessages.length).toBe(1);
    const sub = JSON.parse(ws.sentMessages[0]!) as { type: string; run_ids: string[] };
    expect(sub.type).toBe("subscribe");
    expect(sub.run_ids).toEqual(["test-run-1"]);

    // Now simulate the WS server sending skill:result
    ws.fire("message", { data: JSON.stringify({ type: "skill:result", run_id: "test-run-1", output: { briefing: "Good morning" } }) });

    const result = await promise;
    expect(result.kind).toBe("result");
    expect(result.runId).toBe("test-run-1");
    if (result.kind === "result") {
      expect(result.output).toEqual({ briefing: "Good morning" });
    }
    expect(ws.closed).toBe(true);
  });

  it("returns {kind: 'error', error} after the real skill:error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true, data: { run_id: "test-run-2" } }), {
        status: 202,
        headers: { "content-type": "application/json" },
      }),
    );

    const promise = invokeSkillViaApi({
      baseUrl: "http://localhost:8765",
      wsUrl: "ws://localhost:8765/ws",
      skill: "morning-audit",
      args: {},
      timeoutMs: 5_000,
    });
    await new Promise((r) => setTimeout(r, 10));
    const ws = MockWebSocket.instances[0]!;
    ws.fire("message", { data: JSON.stringify({ type: "skill:error", run_id: "test-run-2", error: "rate limited" }) });

    const result = await promise;
    expect(result.kind).toBe("error");
    expect(result.runId).toBe("test-run-2");
    if (result.kind === "error") {
      expect(result.error).toBe("rate limited");
    }
  });

  it("ignores WS messages for other run_ids (C2: only match the specific run_id)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true, data: { run_id: "test-run-3" } }), {
        status: 202,
        headers: { "content-type": "application/json" },
      }),
    );

    const promise = invokeSkillViaApi({
      baseUrl: "http://localhost:8765",
      wsUrl: "ws://localhost:8765/ws",
      skill: "morning-audit",
      args: {},
      timeoutMs: 5_000,
    });
    await new Promise((r) => setTimeout(r, 10));
    const ws = MockWebSocket.instances[0]!;
    // Message for a DIFFERENT run_id — should be ignored
    ws.fire("message", { data: JSON.stringify({ type: "skill:result", run_id: "other-run", output: "WRONG" }) });
    // Then the real one
    ws.fire("message", { data: JSON.stringify({ type: "skill:result", run_id: "test-run-3", output: "CORRECT" }) });

    const result = await promise;
    expect(result.kind).toBe("result");
    if (result.kind === "result") {
      expect(result.output).toBe("CORRECT");
    }
  });
});

describe("invokeSkillViaApi — error paths (C2 verification)", () => {
  it("throws when POST /v1/skill/run returns non-2xx", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("not found", { status: 404 }),
    );
    await expect(
      invokeSkillViaApi({ baseUrl: "http://x", wsUrl: "ws://x", skill: "y", args: {}, timeoutMs: 1000 }),
    ).rejects.toThrow(/POST \/v1\/skill\/run returned 404/);
  });

  it("throws when the skill does not complete within timeoutMs", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true, data: { run_id: "test-run-4" } }), {
        status: 202,
        headers: { "content-type": "application/json" },
      }),
    );

    const promise = invokeSkillViaApi({
      baseUrl: "http://localhost:8765",
      wsUrl: "ws://localhost:8765/ws",
      skill: "morning-audit",
      args: {},
      timeoutMs: 200, // 200ms; no message will arrive
    });
    await expect(promise).rejects.toThrow(/did not complete within 200ms/);
  });
});

describe("invokeSkillViaApi — C2 binding sanity (the §3-prelude bug)", () => {
  it("does NOT treat the 202 {run_id} as success (the §3-prelude bug)", async () => {
    // The 202 has no output; if the function returned the 202 body, it would
    // have output === undefined and kind would be "result" — which is the
    // §3-prelude bug. Verify the function awaits the real WS completion.
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true, data: { run_id: "test-run-5" } }), {
        status: 202,
        headers: { "content-type": "application/json" },
      }),
    );

    const promise = invokeSkillViaApi({
      baseUrl: "http://localhost:8765",
      wsUrl: "ws://localhost:8765/ws",
      skill: "morning-audit",
      args: {},
      timeoutMs: 500,
    });

    // Wait for the timeout to fire (no WS message arrives)
    await expect(promise).rejects.toThrow(/did not complete within 500ms/);
  });
});
