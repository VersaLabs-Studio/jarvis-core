// =============================================================================
// Tests for nonStreamChatWithToolCalls (Phase E §4.3 — §3 prelude).
//
// Verifies chain fallback semantics (the same as chat-stream.ts), tool_calls
// parsing (valid + invalid JSON args), and the VALIDATION-no-retry rule.
// =============================================================================

import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

// Mock model-resolver so nonStreamChatWithToolCalls's `getResolved()` returns
// a stub ResolvedModels without hitting the network.
vi.mock("../../src/lib/model-resolver.js", () => ({
  getResolved: vi.fn(() => ({
    planning: { primary: { configured: "p", resolved: "p", autoCorrected: false, candidatesTried: [], foundInCatalog: true }, fallback: [], missing: [] },
    coding:   { primary: { configured: "c", resolved: "c", autoCorrected: false, candidatesTried: [], foundInCatalog: true }, fallback: [], missing: [] },
    office:   { primary: { configured: "o", resolved: "o", autoCorrected: false, candidatesTried: [], foundInCatalog: true }, fallback: [], missing: [] },
    fast:     { primary: { configured: "f", resolved: "f", autoCorrected: false, candidatesTried: [], foundInCatalog: true }, fallback: [], missing: [] },
    audit:    { primary: { configured: "a", resolved: "a", autoCorrected: false, candidatesTried: [], foundInCatalog: true }, fallback: [], missing: [] },
  })),
}));

import { nonStreamChatWithToolCalls, OpenRouterError } from "../../src/lib/openrouter.js";

const TEST_API_KEY = "test-openrouter-key-1234567890";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function openRouterOk(body: { content?: string | null; tool_calls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }> }): Response {
  return jsonResponse(200, {
    id: "chatcmpl-test",
    model: "test-model",
    choices: [
      {
        message: {
          role: "assistant",
          content: body.content ?? null,
          tool_calls: body.tool_calls,
        },
        finish_reason: "stop",
        index: 0,
      },
    ],
    usage: { prompt_tokens: 10, completion_tokens: 5 },
  });
}

function openRouterError(status: number): Response {
  return new Response(JSON.stringify({ error: { message: `status ${status}` } }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  process.env.OPENROUTER_API_KEY = TEST_API_KEY;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("nonStreamChatWithToolCalls — happy path", () => {
  it("returns text + toolCalls on a successful first-model call (no fallback)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      openRouterOk({
        content: "Hello world",
        tool_calls: [{ id: "tc_1", type: "function", function: { name: "code_exec", arguments: '{"code":"x","language":"node"}' } }],
      }),
    );

    const result = await nonStreamChatWithToolCalls({
      role: "coding",
      messages: [{ role: "user", content: "hi" }],
      tools: [{ type: "function", function: { name: "code_exec", parameters: {} } }],
    });

    expect(result.text).toBe("Hello world");
    expect(result.toolCalls.length).toBe(1);
    expect(result.toolCalls[0]).toEqual({ id: "tc_1", name: "code_exec", args: { code: "x", language: "node" } });
    expect(result.model).toBe("test-model");
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("parses tool_calls with valid JSON args into args object", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      openRouterOk({
        tool_calls: [{ id: "tc_2", type: "function", function: { name: "github", arguments: '{"tool":"create_issue","args":{"title":"bug"}}' } }],
      }),
    );
    const result = await nonStreamChatWithToolCalls({
      role: "coding",
      messages: [],
      tools: [{ type: "function", function: { name: "github", parameters: {} } }],
    });
    expect(result.toolCalls[0]!.args).toEqual({ tool: "create_issue", args: { title: "bug" } });
  });

  it("wraps non-object tool args under 'value' (defensive parsing)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      openRouterOk({
        tool_calls: [{ id: "tc_3", type: "function", function: { name: "x", arguments: '"just a string"' } }],
      }),
    );
    const result = await nonStreamChatWithToolCalls({
      role: "coding",
      messages: [],
      tools: [{ type: "function", function: { name: "x", parameters: {} } }],
    });
    expect(result.toolCalls[0]!.args).toEqual({ value: "just a string" });
  });

  it("wraps invalid JSON tool args under '_raw' (LLM streamed partial JSON)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      openRouterOk({
        tool_calls: [{ id: "tc_4", type: "function", function: { name: "x", arguments: '{"code":' } }],
      }),
    );
    const result = await nonStreamChatWithToolCalls({
      role: "coding",
      messages: [],
      tools: [{ type: "function", function: { name: "x", parameters: {} } }],
    });
    expect(result.toolCalls[0]!.args).toEqual({ _raw: '{"code":' });
  });
});

describe("nonStreamChatWithToolCalls — chain fallback", () => {
  it("falls back to the next model when the first returns 404", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    // First call: 404
    fetchSpy.mockResolvedValueOnce(openRouterError(404));
    // Second call: 200 (use office chain's primary as the fallback; we mock
    // the resolver to give every role one resolved model, so the second
    // call's URL is whatever the office chain resolves to — we just check it
    // happens)
    fetchSpy.mockResolvedValueOnce(openRouterOk({ content: "ok from fallback" }));

    const result = await nonStreamChatWithToolCalls({
      role: "office", // office chain = [office.primary, ...office.fallback[]] = [o] in our stub
      messages: [],
      tools: [],
    });
    expect(result.text).toBe("ok from fallback");
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("does NOT retry on VALIDATION (400) — throws immediately", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(openRouterError(400));

    await expect(
      nonStreamChatWithToolCalls({
        role: "coding",
        messages: [],
        tools: [],
      }),
    ).rejects.toThrow(OpenRouterError);

    expect(fetchSpy).toHaveBeenCalledTimes(1); // no retry
  });

  it("throws CHAIN_EXHAUSTED when every model in the chain fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(openRouterError(404));

    await expect(
      nonStreamChatWithToolCalls({
        role: "audit", // audit chain = [audit.primary] in our stub
        messages: [],
        tools: [],
      }),
    ).rejects.toThrow(/CHAIN_EXHAUSTED/);
  });

  it("throws on network errors (fetch rejects)", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ENOTFOUND openrouter.ai"));

    await expect(
      nonStreamChatWithToolCalls({
        role: "coding",
        messages: [],
        tools: [],
      }),
    ).rejects.toThrow(/CHAIN_EXHAUSTED/);
  });
});
