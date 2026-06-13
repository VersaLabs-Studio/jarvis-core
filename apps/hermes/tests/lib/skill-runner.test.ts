// =============================================================================
// Tests for the agentic skill runner (Phase E §3 option A — §4.2).
//
// The runner drives a 10-iteration LLM loop, dispatching tool_calls and
// feeding results back. These tests mock the LLM + tool-executor + WS
// broadcast to verify:
//   - text-only response broadcasts skill:result and exits in 1 iteration
//   - tool call → tool result → text broadcasts skill:result after 2 iterations
//   - always tool calls (mock) → MAX_ITERATIONS_REACHED + skill:error
//   - LLM error → skill:error with the error message
//   - out-of-scope tool call → TOOL_NOT_ALLOWED fed back to the LLM
//   - tool result is JSON-serialized into the `tool` message
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SkillDoc, HermesMessage, HermesRole } from "@jarvis/shared";

// ---------------------------------------------------------------------------
// Hoisted mocks (run before any import; factories are hoisted too)
// ---------------------------------------------------------------------------

const { mockNonStream, mockExecuteToolCall, mockGetAlwaysLoaded, mockBroadcast } = vi.hoisted(() => ({
  mockNonStream: vi.fn(),
  mockExecuteToolCall: vi.fn(),
  mockGetAlwaysLoaded: vi.fn(() => ""),
  mockBroadcast: vi.fn(),
}));

vi.mock("../../src/lib/openrouter.js", () => ({
  nonStreamChatWithToolCalls: mockNonStream,
  // Other exports are not used by skill-runner; provide stubs so any leak doesn't fail.
  streamChat: vi.fn(),
  nonStreamChat: vi.fn(),
  OpenRouterError: class OpenRouterError extends Error {
    public readonly code: "UPSTREAM_ERROR" | "TIMEOUT" | "MODEL_NOT_FOUND" | "VALIDATION";
    public readonly status: number;
    public readonly model: string;
    constructor(code: "UPSTREAM_ERROR" | "TIMEOUT" | "MODEL_NOT_FOUND" | "VALIDATION", message: string, status: number, model: string) {
      super(message);
      this.code = code;
      this.status = status;
      this.model = model;
    }
  },
}));

vi.mock("../../src/lib/tool-executor.js", () => ({
  executeToolCall: mockExecuteToolCall,
  PENDING_MCP_SERVERS: ["slack"],
  LOCAL_MCP_SERVERS: ["github", "notion", "supabase", "filesystem", "browser", "gmail"],
  HOSTED_MCP_SERVERS: ["vercel", "linear"],
}));

vi.mock("../../src/lib/skill-loader.js", () => ({
  getAlwaysLoadedSystemContext: mockGetAlwaysLoaded,
  getLoadedSkills: vi.fn(() => []),
  getSkillByName: vi.fn(() => null),
}));

vi.mock("../../src/routes/ws.js", () => ({
  broadcast: mockBroadcast,
}));

// Import after mocks are registered
const { runSkillAgentically, MAX_AGENT_ITERATIONS, buildSkillSystemMessage, computeAllowedTools, buildToolDefinitions } =
  await import("../../src/lib/skill-runner.js");

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeSkillDoc(opts: { name?: string; tools_required?: string[]; category?: string } = {}): SkillDoc {
  return {
    frontmatter: {
      name: opts.name ?? "test-skill",
      description: "a test skill",
      trigger: ["test trigger"],
      tools_required: opts.tools_required ?? [],
      category: opts.category ?? "swe",
      estimated_time: "1 minute",
      always_loaded: false,
      preferred_model_role: "coding",
    },
    body: `# Test Skill\n## Purpose\ndo the test thing\n## Steps\n1. step one\n## Output\nresult\n## Error Handling\nretry\n## Quality Checks\nok`,
    source: "/skills/test.md",
  };
}

beforeEach(() => {
  mockNonStream.mockReset();
  mockExecuteToolCall.mockReset();
  mockGetAlwaysLoaded.mockReset();
  mockBroadcast.mockReset();
  mockGetAlwaysLoaded.mockReturnValue(""); // no system context by default
  // The logger singleton calls getEnv() on first use.
  process.env.OPENROUTER_API_KEY = "test-openrouter-key-1234567890";
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("runSkillAgentically — text-only response", () => {
  it("broadcasts skill:result after 1 iteration and exits", async () => {
    mockNonStream.mockResolvedValue({
      text: "All done.",
      toolCalls: [],
      usage: { tokens_in: 10, tokens_out: 5, duration_ms: 100 },
      model: "test-model",
    });

    await runSkillAgentically({
      runId: "run_1",
      skill: "test-skill",
      doc: makeSkillDoc(),
      args: {},
      role: "coding",
      initialMessage: "Do the thing",
    });

    expect(mockNonStream).toHaveBeenCalledTimes(1);
    expect(mockBroadcast).toHaveBeenCalledWith(
      expect.objectContaining({ type: "skill:result", run_id: "run_1", output: "All done." }),
    );
  });
});

describe("runSkillAgentically — tool call + final text", () => {
  it("dispatches the tool call, feeds the result back, then broadcasts skill:result on the text response", async () => {
    // First call: LLM emits a code_exec tool call
    mockNonStream.mockResolvedValueOnce({
      text: "",
      toolCalls: [{ id: "tc_1", name: "code_exec", args: { code: 'console.log(1);', language: "node" } }],
      usage: { tokens_in: 10, tokens_out: 5, duration_ms: 50 },
      model: "test-model",
    });
    // tool-executor returns ok
    mockExecuteToolCall.mockResolvedValue({
      ok: true,
      output: { stdout: "1\n", exitCode: 0 },
    });
    // Second call: LLM emits final text
    mockNonStream.mockResolvedValueOnce({
      text: "Computed: 1",
      toolCalls: [],
      usage: { tokens_in: 15, tokens_out: 8, duration_ms: 80 },
      model: "test-model",
    });

    await runSkillAgentically({
      runId: "run_2",
      skill: "data-analysis",
      doc: makeSkillDoc({ name: "data-analysis", tools_required: [], category: "analysis" }),
      args: {},
      role: "coding",
      initialMessage: "Compute 1+0",
    });

    expect(mockNonStream).toHaveBeenCalledTimes(2);
    expect(mockExecuteToolCall).toHaveBeenCalledTimes(1);
    expect(mockExecuteToolCall).toHaveBeenCalledWith(
      expect.objectContaining({ name: "code_exec", args: { code: 'console.log(1);', language: "node" } }),
    );
    // Second LLM call's messages should include the tool result
    const secondCall = mockNonStream.mock.calls[1]![0] as { messages: HermesMessage[] };
    const toolMsg = secondCall.messages.find((m) => m.role === "tool" && m.tool_call_id === "tc_1");
    expect(toolMsg).toBeDefined();
    expect(toolMsg!.content).toMatch(/ok.*true.*stdout/s);
    expect(mockBroadcast).toHaveBeenCalledWith(
      expect.objectContaining({ type: "skill:result", run_id: "run_2", output: "Computed: 1" }),
    );
  });
});

describe("runSkillAgentically — max iterations", () => {
  it("broadcasts skill:error MAX_ITERATIONS_REACHED when the LLM always emits tool calls", async () => {
    // Always returns a tool call
    mockNonStream.mockResolvedValue({
      text: "",
      toolCalls: [{ id: "tc_x", name: "code_exec", args: { code: "//loop", language: "node" } }],
      usage: { tokens_in: 1, tokens_out: 1, duration_ms: 1 },
      model: "test-model",
    });
    mockExecuteToolCall.mockResolvedValue({ ok: true, output: { stdout: "", exitCode: 0 } });

    await runSkillAgentically({
      runId: "run_3",
      skill: "data-analysis",
      doc: makeSkillDoc({ category: "analysis" }),
      args: {},
      role: "coding",
      initialMessage: "loop",
      maxIterations: 3, // shrink for the test
    });

    expect(mockNonStream).toHaveBeenCalledTimes(3);
    expect(mockBroadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "skill:error",
        run_id: "run_3",
        error: expect.stringMatching(/MAX_ITERATIONS_REACHED: 3/),
      }),
    );
  });

  it("MAX_AGENT_ITERATIONS is 10 (the §3 prelude default)", () => {
    expect(MAX_AGENT_ITERATIONS).toBe(10);
  });
});

describe("runSkillAgentically — LLM error", () => {
  it("broadcasts skill:error when the LLM call throws", async () => {
    mockNonStream.mockRejectedValue(new Error("OpenRouter 500: server error"));

    await runSkillAgentically({
      runId: "run_4",
      skill: "test-skill",
      doc: makeSkillDoc(),
      args: {},
      role: "coding",
      initialMessage: "Do the thing",
    });

    expect(mockBroadcast).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "skill:error",
        run_id: "run_4",
        error: expect.stringMatching(/LLM call failed/),
      }),
    );
    // No further LLM calls after the error
    expect(mockNonStream).toHaveBeenCalledTimes(1);
  });
});

describe("runSkillAgentically — tool allow-list (C3 binding)", () => {
  it("rejects a tool call not in the skill's allow-list with TOOL_NOT_ALLOWED", async () => {
    // Skill requires only 'github' (no code_exec since category is 'swe' and
    // code_exec is auto-added only for swe/analysis... actually swe DOES get
    // code_exec. Use 'communication' category to keep the allow-list minimal.)
    const doc = makeSkillDoc({ name: "email-draft", tools_required: ["gmail"], category: "communication" });
    // LLM emits a tool call for 'github' (not in allow-list — only 'gmail' is)
    mockNonStream.mockResolvedValueOnce({
      text: "",
      toolCalls: [{ id: "tc_bad", name: "github", args: { tool: "create_issue" } }],
      usage: { tokens_in: 1, tokens_out: 1, duration_ms: 1 },
      model: "test-model",
    });
    mockExecuteToolCall.mockResolvedValue({ ok: true, output: { stdout: "1", exitCode: 0 } });
    // LLM emits final text on the next call
    mockNonStream.mockResolvedValueOnce({
      text: "Done",
      toolCalls: [],
      usage: { tokens_in: 1, tokens_out: 1, duration_ms: 1 },
      model: "test-model",
    });

    await runSkillAgentically({
      runId: "run_5",
      skill: "email-draft",
      doc,
      args: {},
      role: "office",
      initialMessage: "Draft an email",
    });

    // The 'github' tool call should NOT have been dispatched to executeToolCall
    expect(mockExecuteToolCall).not.toHaveBeenCalled();
    // But a tool message with TOOL_NOT_ALLOWED should have been added
    const secondCall = mockNonStream.mock.calls[1]![0] as { messages: HermesMessage[] };
    const toolMsg = secondCall.messages.find((m) => m.role === "tool" && m.tool_call_id === "tc_bad");
    expect(toolMsg).toBeDefined();
    expect(toolMsg!.content).toMatch(/TOOL_NOT_ALLOWED.*github/);
  });

  it("allows code_exec only for swe/analysis categories (C3 alignment)", () => {
    expect(computeAllowedTools(makeSkillDoc({ category: "swe" }))).toContain("code_exec");
    expect(computeAllowedTools(makeSkillDoc({ category: "analysis" }))).toContain("code_exec");
    expect(computeAllowedTools(makeSkillDoc({ category: "communication" }))).not.toContain("code_exec");
    expect(computeAllowedTools(makeSkillDoc({ category: "content" }))).not.toContain("code_exec");
  });

  it("filters out pending MCP servers (slack) from the allow-list", () => {
    const allowed = computeAllowedTools(makeSkillDoc({ tools_required: ["slack", "github"] }));
    expect(allowed).toContain("github");
    expect(allowed).not.toContain("slack");
  });
});

describe("skill-runner helpers", () => {
  it("buildSkillSystemMessage embeds the skill body + JSON-formatted args", () => {
    const doc = makeSkillDoc({ name: "test-skill" });
    const msg = buildSkillSystemMessage(doc, { a: 1, b: "two" });
    expect(msg).toContain("# Skill: test-skill");
    expect(msg).toContain(doc.body);
    expect(msg).toContain('"a": 1');
    expect(msg).toContain('"b": "two"');
  });

  it("buildToolDefinitions emits one entry per allowed tool with the right shape", () => {
    const defs = buildToolDefinitions(["code_exec", "github"]);
    expect(defs.length).toBe(2);
    expect(defs[0]!.function.name).toBe("code_exec");
    expect(defs[0]!.function.parameters).toBeDefined();
    expect(defs[1]!.function.name).toBe("github");
  });
});
