// =============================================================================
// Tests for the tool executor (Phase E §3 prelude + §5.3 E3).
//
// code_exec dispatches to the F1-fixed sandbox. MCP calls dispatch to the
// real bridge via mcp-client.ts (E3, C1 binding). The mcp-client module
// is mocked here so the test doesn't make a real network call; the
// mcp-client.test.ts verifies the real call shape.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoisted mocks: vi.mock runs before imports, so the mock factory is hoisted.
// We mock the sandbox (so no real subprocess) AND the mcp-client
// (so no real network call).
const { mockRunUntrustedCode, mockCallMcpTool } = vi.hoisted(() => ({
  mockRunUntrustedCode: vi.fn(),
  mockCallMcpTool: vi.fn(),
}));

vi.mock("../../src/sandbox/spawn.js", () => ({
  runUntrustedCode: mockRunUntrustedCode,
}));

vi.mock("../../src/lib/mcp-client.js", () => ({
  callMcpTool: mockCallMcpTool,
  probeMcpHealth: vi.fn(),
  probeMcpTools: vi.fn(),
}));

import { executeToolCall, PENDING_MCP_SERVERS, LOCAL_MCP_SERVERS } from "../../src/lib/tool-executor.js";

beforeEach(() => {
  process.env.OPENROUTER_API_KEY = "test-openrouter-key-1234567890";
  mockRunUntrustedCode.mockReset();
  mockCallMcpTool.mockReset();
});

describe("executeToolCall — code_exec", () => {
  it("dispatches a node code_exec tool call to runUntrustedCode and returns ok:true with stdout", async () => {
    mockRunUntrustedCode.mockResolvedValue({
      stdout: "42\n",
      stderr: "",
      exitCode: 0,
      durationMs: 50,
      timedOut: false,
      oomKilled: false,
    });
    const result = await executeToolCall({
      id: "tc_1",
      name: "code_exec",
      args: { code: 'console.log(40 + 2);', language: "node" },
    });
    expect(result.ok).toBe(true);
    expect(result.output).toEqual({ stdout: "42\n", exitCode: 0 });
    expect(mockRunUntrustedCode).toHaveBeenCalledWith({
      code: 'console.log(40 + 2);',
      language: "node",
      timeoutMs: 60_000,
    });
  });

  it("returns ok:false with the stderr when the subprocess exits non-zero", async () => {
    mockRunUntrustedCode.mockResolvedValue({
      stdout: "",
      stderr: "ReferenceError: x is not defined",
      exitCode: 1,
      durationMs: 20,
      timedOut: false,
      oomKilled: false,
    });
    const result = await executeToolCall({
      id: "tc_1",
      name: "code_exec",
      args: { code: "x;", language: "node" },
    });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("ReferenceError");
  });

  it("returns ok:false with a timeout error when the subprocess times out", async () => {
    mockRunUntrustedCode.mockResolvedValue({
      stdout: "",
      stderr: "",
      exitCode: 137,
      durationMs: 60_001,
      timedOut: true,
      oomKilled: false,
    });
    const result = await executeToolCall({
      id: "tc_1",
      name: "code_exec",
      args: { code: "while(true){}", language: "node" },
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/timed out/i);
  });

  it("rejects an unknown language with ok:false", async () => {
    const result = await executeToolCall({
      id: "tc_1",
      name: "code_exec",
      args: { code: "print(1)", language: "ruby" as "node" },
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/language must be node/);
  });

  it("rejects a missing 'code' argument with ok:false", async () => {
    const result = await executeToolCall({
      id: "tc_1",
      name: "code_exec",
      args: { language: "node" },
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/requires a 'code' string/);
  });
});

describe("executeToolCall — pending MCP servers", () => {
  it("returns MCP_PENDING for slack (Part 4 §4.6 — archived upstream)", async () => {
    const result = await executeToolCall({
      id: "tc_1",
      name: "slack",
      args: { tool: "send_message", args: { channel: "general", text: "hi" } },
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/MCP_PENDING.*slack/);
  });
});

describe("executeToolCall — local MCP servers (E3 wires the real bridge; mocked here)", () => {
  it("dispatches a github tool call to mcp-client.callMcpTool (real stdio via bridge)", async () => {
    mockCallMcpTool.mockResolvedValue({
      ok: true,
      output: { pr_url: "https://github.com/owner/repo/pull/42" },
    });
    const result = await executeToolCall({
      id: "tc_1",
      name: "github",
      args: { tool: "create_pull_request", args: { title: "x", body: "y" } },
    });
    expect(result.ok).toBe(true);
    expect(result.output).toEqual({ pr_url: "https://github.com/owner/repo/pull/42" });
    expect(mockCallMcpTool).toHaveBeenCalledWith("github", {
      tool: "create_pull_request",
      args: { title: "x", body: "y" },
    });
  });

  it("dispatches a vercel tool call to mcp-client.callMcpTool (real HTTPS to hosted)", async () => {
    mockCallMcpTool.mockResolvedValue({
      ok: true,
      output: { deployment_id: "dpl_abc123", url: "https://jarvis.vercel.app" },
    });
    const result = await executeToolCall({
      id: "tc_1",
      name: "vercel",
      args: { tool: "deploy", args: { project: "jarvis" } },
    });
    expect(result.ok).toBe(true);
    expect(result.output).toEqual({ deployment_id: "dpl_abc123", url: "https://jarvis.vercel.app" });
    expect(mockCallMcpTool).toHaveBeenCalledWith("vercel", {
      tool: "deploy",
      args: { project: "jarvis" },
    });
  });

  it("propagates a bridge timeout as a structured ok:false result", async () => {
    mockCallMcpTool.mockResolvedValue({
      ok: false,
      error: "MCP_BRIDGE_TIMEOUT: github did not respond in 30000ms",
    });
    const result = await executeToolCall({
      id: "tc_1",
      name: "github",
      args: { tool: "list_pull_requests" },
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/MCP_BRIDGE_TIMEOUT/);
  });
});

describe("tool allow-list constants", () => {
  it("LOCAL_MCP_SERVERS contains the 6 wired local containers", () => {
    expect(LOCAL_MCP_SERVERS).toEqual(
      expect.arrayContaining(["github", "notion", "supabase", "filesystem", "browser", "gmail"]),
    );
    expect(LOCAL_MCP_SERVERS.length).toBe(6);
  });

  it("PENDING_MCP_SERVERS contains slack only", () => {
    expect(PENDING_MCP_SERVERS).toEqual(["slack"]);
  });
});
