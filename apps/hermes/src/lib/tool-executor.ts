// =============================================================================
// Tool executor (Phase E §3 option A — §3 prelude + §5.3 E3).
//
// Routes a tool_call from the LLM to:
//   code_exec                          → apps/hermes/src/sandbox/spawn.ts (F1-fixed)
//   github|vercel|notion|supabase|...  → apps/hermes/src/lib/mcp-client.ts
//
// The MCP branch is a STRUCTURED STUB in the §3 prelude; E3 replaces it with
// a real HTTP-bridge call to the per-server MCP container (C1 binding).
// Slack is intentionally pending — Part 4 §4.6 marks the upstream archived.
// =============================================================================

import { runUntrustedCode, type SandboxLanguage } from "../sandbox/spawn.js";
import { callMcpTool } from "./mcp-client.js";
import { log } from "./logger.js";

/**
 * The full set of tool names the LLM may emit. The agentic runner checks
 * each tool_call against the skill's allow-list (skill.tools_required ∪
 * {"code_exec"} for swe/analysis categories); anything outside the allow-list
 * is rejected with TOOL_NOT_ALLOWED.
 */
export type ToolExecutor =
  | "code_exec"
  | "github"
  | "vercel"
  | "notion"
  | "supabase"
  | "filesystem"
  | "browser"
  | "gmail"
  | "slack"
  | "linear";

/**
 * The subset of tool names that map to local MCP containers (E3 wires
 * these via the HTTP bridge). Vercel and Linear are hosted (not local);
 * `slack` is pending in v1.5.
 */
export const LOCAL_MCP_SERVERS: ReadonlyArray<Exclude<ToolExecutor, "code_exec">> = [
  "github",
  "notion",
  "supabase",
  "filesystem",
  "browser",
  "gmail",
];

export const HOSTED_MCP_SERVERS: ReadonlyArray<Exclude<ToolExecutor, "code_exec">> = [
  "vercel",
  "linear",
];

export const PENDING_MCP_SERVERS: ReadonlyArray<Exclude<ToolExecutor, "code_exec">> = [
  "slack",
];

export interface ToolCallRecord {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface ToolResult {
  ok: boolean;
  output?: unknown;
  error?: string;
}

/**
 * Dispatch a single tool call. Throws on invalid input; returns a structured
 * ToolResult on success or failure (the agentic loop feeds this back to the
 * LLM as a `tool` message).
 */
export async function executeToolCall(tc: ToolCallRecord): Promise<ToolResult> {
  const name = tc.name as ToolExecutor;

  if (name === "code_exec") {
    return executeCodeExec(tc.args);
  }

  if (PENDING_MCP_SERVERS.includes(name as (typeof PENDING_MCP_SERVERS)[number])) {
    return {
      ok: false,
      error: `MCP_PENDING: server "${name}" is not wired in v1.5 (Part 4 §4.6). Verify before production use.`,
    };
  }

  // For wired MCP servers (local or hosted): dispatch to the MCP client.
  // The C1 closure: the client makes a real HTTP call to the per-server
  // MCP bridge (apps/mcp/src/bridge.js), which forwards the request to
  // the stdio MCP server via @modelcontextprotocol/sdk. The bridge is
  // the C1 binding — no stub for any of the 6 wired local containers.
  const toolName = typeof tc.args["tool"] === "string" ? (tc.args["tool"] as string) : "";
  const toolArgs = (tc.args["args"] as Record<string, unknown>) ?? {};
  const result = await callMcpTool(name, { tool: toolName, args: toolArgs });
  return {
    ok: result.ok,
    output: result.output,
    error: result.error,
  };
}

/**
 * Execute a code-exec tool call against the sandbox. The sandbox is F1-fixed
 * (snippet writes into its own taskDir, secrets stripped, depth-1 cap).
 */
async function executeCodeExec(args: Record<string, unknown>): Promise<ToolResult> {
  const code = typeof args["code"] === "string" ? args["code"] : null;
  const language = typeof args["language"] === "string" ? (args["language"] as SandboxLanguage) : "node";
  if (code == null) {
    return { ok: false, error: "code_exec requires a 'code' string argument" };
  }
  if (language !== "node" && language !== "python" && language !== "bash") {
    return { ok: false, error: `code_exec language must be node, python, or bash (got "${language}")` };
  }
  try {
    const result = await runUntrustedCode({ code, language, timeoutMs: 60_000 });
    if (result.timedOut) {
      return { ok: false, error: "code_exec timed out after 60s" };
    }
    if (result.exitCode !== 0) {
      return {
        ok: false,
        output: { stdout: result.stdout, exitCode: result.exitCode },
        error: result.stderr || `exit code ${result.exitCode}`,
      };
    }
    return { ok: true, output: { stdout: result.stdout, exitCode: 0 } };
  } catch (err) {
    log.error({ err: err instanceof Error ? err.message : String(err) }, "code_exec failed");
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * MCP tool call — REAL invocation via the per-server bridge.
 *
 * The bridge (apps/mcp/src/bridge.js) is a Node script that:
 *   1. Spawns a stdio MCP server (the npm package for this server name)
 *   2. Connects to it via @modelcontextprotocol/sdk's StdioClientTransport
 *   3. Exposes HTTP /call which forwards to the stdio server
 *
 * C1 binding: this is real invocation, not a stub. The agentic loop's
 * `tool-executor.ts` calls `callMcpTool(name, {tool, args})`; the bridge
 * makes a real JSON-RPC call to the stdio MCP server; the result is
 * the actual tool output.
 *
 * The `args` parameter for the local function is `Record<string, unknown>`
 * for backward compatibility with the original signature; the real
 * shape is `{ tool: string, args: object }` (extracted in `executeToolCall`).
 */
