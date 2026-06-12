// =============================================================================
// Tests for the tool executor (Phase E §3 prelude + §5.3 E3).
//
// code_exec dispatches to the F1-fixed sandbox. MCP calls return a
// structured stub in the §3 prelude; E3 (C1) wires the real bridge.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";

// Hoisted mocks: vi.mock runs before imports, so the mock factory is hoisted.
// We mock the sandbox so no real subprocess is spawned.
const { mockRunUntrustedCode } = vi.hoisted(() => ({
  mockRunUntrustedCode: vi.fn(),
}));

vi.mock("../../src/sandbox/spawn.js", () => ({
  runUntrustedCode: mockRunUntrustedCode,
}));

import { executeToolCall, PENDING_MCP_SERVERS, LOCAL_MCP_SERVERS } from "../../src/lib/tool-executor.js";

beforeEach(() => {
  process.env.OPENROUTER_API_KEY = "test-openrouter-key-1234567890";
  mockRunUntrustedCode.mockReset();
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

describe("executeToolCall — local MCP servers (E3 will wire)", () => {
  it("returns MCP_LOCAL_STUB for github in the §3 prelude (E3 wires the real bridge)", async () => {
    const result = await executeToolCall({
      id: "tc_1",
      name: "github",
      args: { tool: "create_pull_request", args: { title: "x", body: "y" } },
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/MCP_LOCAL_STUB.*github/);
  });

  it("returns MCP_HOSTED_STUB for vercel (hosted; OAuth is F-scope)", async () => {
    const result = await executeToolCall({
      id: "tc_1",
      name: "vercel",
      args: { tool: "deploy", args: { project: "jarvis" } },
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/MCP_HOSTED_STUB.*vercel/);
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
