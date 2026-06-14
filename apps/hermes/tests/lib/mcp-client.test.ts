// =============================================================================
// Tests for the MCP client (Phase E §5.3 E3 — C1 binding: real stdio invocation).
//
// The mcp-client calls the per-server MCP bridge over HTTP. Tests mock `fetch`
// to verify:
//   - local URL: `http://mcp-<server>:8765/call`
//   - hosted URL: `https://mcp.<server>.com/call` (vercel, linear)
//   - request body shape
//   - response shape
//   - timeout handling
//   - error handling
//   - liveness+log probe (`/health` + `/tools`)
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { callMcpTool, probeMcpHealth, probeMcpTools } from "../../src/lib/mcp-client.js";

beforeEach(() => {
  process.env.OPENROUTER_API_KEY = "test-openrouter-key-1234567890";
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("callMcpTool — URL resolution", () => {
  it("routes local servers to the per-container bridge", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true, result: { pr_url: "x" } }), { status: 200, headers: { "content-type": "application/json" } }),
    );
    await callMcpTool("github", { tool: "list_pull_requests", args: {} });
    expect(fetchSpy).toHaveBeenCalledWith(
      "http://mcp-github:8765/call",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("routes vercel (hosted) to https://mcp.vercel.com/call", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true, result: {} }), { status: 200, headers: { "content-type": "application/json" } }),
    );
    await callMcpTool("vercel", { tool: "deploy", args: { project: "x" } });
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://mcp.vercel.com/call",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("routes linear (hosted) to https://mcp.linear.app/call", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true, result: {} }), { status: 200, headers: { "content-type": "application/json" } }),
    );
    await callMcpTool("linear", { tool: "list_issues", args: {} });
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://mcp.linear.app/call",
      expect.objectContaining({ method: "POST" }),
    );
  });
});

describe("callMcpTool — request body", () => {
  it("sends { name, arguments } as the request body", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true, result: { ok: 1 } }), { status: 200, headers: { "content-type": "application/json" } }),
    );
    await callMcpTool("github", { tool: "create_pull_request", args: { title: "x", body: "y" } });
    const call = fetchSpy.mock.calls[0]!;
    const init = call[1] as RequestInit;
    expect(JSON.parse(init.body as string)).toEqual({
      name: "create_pull_request",
      arguments: { title: "x", body: "y" },
    });
  });
});

describe("callMcpTool — response handling", () => {
  it("returns ok:true with the result on a successful call", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true, result: { pr_url: "x", id: 42 } }), { status: 200, headers: { "content-type": "application/json" } }),
    );
    const result = await callMcpTool("github", { tool: "create_pull_request", args: { title: "x" } });
    expect(result.ok).toBe(true);
    expect(result.output).toEqual({ pr_url: "x", id: 42 });
    expect(result.error).toBeUndefined();
  });

  it("returns ok:false with the bridge's error message when ok:false in the response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: false, error: "TOOL_NOT_FOUND: foo" }), { status: 200, headers: { "content-type": "application/json" } }),
    );
    const result = await callMcpTool("github", { tool: "foo", args: {} });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/TOOL_NOT_FOUND.*foo/);
  });

  it("returns ok:false with a structured error when the bridge returns 5xx", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("bridge crashed", { status: 500 }),
    );
    const result = await callMcpTool("github", { tool: "list_pull_requests", args: {} });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/MCP_BRIDGE_500/);
  });

  it("returns ok:false with MCP_BRIDGE_TIMEOUT when the bridge is slow", async () => {
    // Mock fetch to never resolve; rely on the AbortController + 30s timeout
    // but use a fake timer to avoid actually waiting 30s.
    vi.useFakeTimers();
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(
      () => new Promise<Response>((_resolve, reject) => {
        // Reject with an AbortError when the controller fires
        setTimeout(() => {
          const err = new Error("aborted");
          err.name = "AbortError";
          reject(err);
        }, 30_000);
      }),
    );
    const promise = callMcpTool("github", { tool: "list_pull_requests", args: {} });
    vi.advanceTimersByTime(31_000);
    const result = await promise;
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/MCP_BRIDGE_TIMEOUT/);
    vi.useRealTimers();
    expect(fetchSpy).toHaveBeenCalled();
  });

  it("returns ok:false with MCP_BRIDGE_UNREACHABLE when the network fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ENOTFOUND mcp-github"));
    const result = await callMcpTool("github", { tool: "list_pull_requests", args: {} });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/MCP_BRIDGE_UNREACHABLE/);
  });
});

describe("probeMcpHealth", () => {
  it("returns the bridge's /health response on success", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ ok: true, server: "github", uptime_s: 120, tool_count: 8, last_refresh: "2026-06-12T10:00:00Z" }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const result = await probeMcpHealth("github");
    expect(result.ok).toBe(true);
    expect(result.server).toBe("github");
    expect(result.uptime_s).toBe(120);
    expect(result.tool_count).toBe(8);
  });

  it("returns ok:false with MCP_HEALTH_404 when the bridge returns 404", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("not found", { status: 404 }));
    const result = await probeMcpHealth("unknown");
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/MCP_HEALTH_404/);
  });
});

describe("probeMcpTools", () => {
  it("returns the cached tools list on success", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ tools: ["create_pull_request", "list_pull_requests"], last_refresh: "2026-06-12T10:00:00Z" }),
        { status: 200, headers: { "content-type": "application/json" } },
      ),
    );
    const result = await probeMcpTools("github");
    expect(result.tools).toEqual(["create_pull_request", "list_pull_requests"]);
    expect(result.error).toBeUndefined();
  });

  it("returns an empty tools list with an error when the bridge returns 5xx", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("crash", { status: 500 }));
    const result = await probeMcpTools("github");
    expect(result.tools).toEqual([]);
    expect(result.error).toMatch(/MCP_TOOLS_500/);
  });
});
