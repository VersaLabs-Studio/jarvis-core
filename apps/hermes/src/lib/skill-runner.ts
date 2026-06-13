// =============================================================================
// Agentic skill runner (Phase E §3 option A — §4.2).
//
// Implements the agentic loop for `POST /v1/skill/run`. The skill body is
// markdown instructions the LLM follows; the runner drives the LLM through
// up to MAX_AGENT_ITERATIONS rounds, dispatching tool_calls (sandbox for
// code_exec; MCP bridge for everything else) and feeding the results back
// as `tool` messages.
//
// Progress is broadcast over the Hermes WS endpoint as `skill:progress`,
// `skill:result`, or `skill:error` (see `routes/ws.ts`).
//
// §3 prelude (route + matcher + tool-executor) wires the dispatch path;
// E3 (C1 binding) replaces the MCP branch in `tool-executor.ts` with the
// real HTTP-bridge call. The agentic loop itself is unchanged.
// =============================================================================

import type { HermesMessage, HermesRole, HermesToolCall, SkillDoc } from "@jarvis/shared";
import { getAlwaysLoadedSystemContext } from "./skill-loader.js";
import { nonStreamChatWithToolCalls, OpenRouterError } from "./openrouter.js";
import {
  executeToolCall,
  LOCAL_MCP_SERVERS,
  PENDING_MCP_SERVERS,
  type ToolExecutor,
  type ToolResult,
} from "./tool-executor.js";
import { broadcast } from "../routes/ws.js";
import { log } from "./logger.js";

/** Hard cap on the number of LLM turns per skill run. */
export const MAX_AGENT_ITERATIONS = 10;

/** Per-iteration timeout (mirrors PER_MODEL_TIMEOUT_MS in openrouter.ts). */
export const AGENT_ITERATION_TIMEOUT_MS = 60_000;

export interface RunSkillParams {
  runId: string;
  skill: string;
  doc: SkillDoc;
  args: Record<string, unknown>;
  /** Chain role (defaults to skill.preferred_model_role ?? "coding"). */
  role: HermesRole;
  /** Initial user message (defaults to "Run the <skill> skill."). */
  initialMessage: string;
  maxIterations?: number;
  iterationTimeoutMs?: number;
}

/**
 * Run a skill agentically. Resolves once the LLM emits a final text response
 * OR the loop terminates (max iterations / unrecoverable error). Progress is
 * broadcast over WS; the route does not await this function (it's fire-and-
 * forget after responding 202 with `{ run_id }`).
 */
export async function runSkillAgentically(params: RunSkillParams): Promise<void> {
  const maxIter = params.maxIterations ?? MAX_AGENT_ITERATIONS;
  const iterTimeout = params.iterationTimeoutMs ?? AGENT_ITERATION_TIMEOUT_MS;
  const { runId, skill, doc, args, role, initialMessage } = params;

  log.info({ runId, skill, role, maxIter }, "Agentic skill run starting");
  broadcast({ type: "skill:progress", run_id: runId, step: "starting", pct: 0, status: "running" });

  // Build the initial message list. Order:
  //   1. Always-loaded system context (architectural-dna, etc.)
  //   2. The skill's body + args as a system message
  //   3. The initial user message (the kickoff for the agentic loop)
  const messages: HermesMessage[] = [];
  const sysContext = getAlwaysLoadedSystemContext();
  if (sysContext) {
    messages.push({ role: "system", content: sysContext });
  }
  messages.push({
    role: "system",
    content: buildSkillSystemMessage(doc, args),
  });
  messages.push({ role: "user", content: initialMessage });

  // Build the tool allow-list (C3 alignment): skill.tools_required + code_exec
  // (for swe/analysis categories). The allow-list filters what the LLM may
  // invoke; tool_calls outside the list are rejected with TOOL_NOT_ALLOWED.
  const allowedToolNames = computeAllowedTools(doc);
  const toolDefs = buildToolDefinitions(allowedToolNames);

  for (let i = 0; i < maxIter; i++) {
    log.info({ runId, iteration: i + 1, role, toolCount: allowedToolNames.length }, "Agentic loop iteration");
    let response;
    try {
      response = await nonStreamChatWithToolCalls({
        role,
        messages,
        tools: toolDefs,
        timeoutMs: iterTimeout,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (err instanceof OpenRouterError && err.code === "VALIDATION") {
        log.error({ err: msg, runId, iteration: i + 1 }, "Agentic loop: validation error (no retry)");
        broadcast({ type: "skill:error", run_id: runId, error: `VALIDATION: ${msg}` });
        return;
      }
      log.error({ err: msg, runId, iteration: i + 1 }, "Agentic loop: LLM call failed");
      broadcast({ type: "skill:error", run_id: runId, error: `LLM call failed: ${msg}` });
      return;
    }

    // If the LLM emitted tool calls, dispatch them and feed the results back.
    if (response.toolCalls.length > 0) {
      // Persist the assistant message verbatim (with its tool_calls) so the
      // tool responses can be correlated by tool_call_id.
      messages.push({
        role: "assistant",
        content: response.text || "",
        tool_calls: response.toolCalls,
      });
      for (const tc of response.toolCalls) {
        const toolName = tc.name as ToolExecutor;
        if (!allowedToolNames.includes(toolName)) {
          log.warn({ runId, toolName, allowList: allowedToolNames }, "Tool call rejected (not in allow-list)");
          messages.push({
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify({ error: `TOOL_NOT_ALLOWED: ${toolName}` }),
          });
          continue;
        }
        broadcast({
          type: "skill:progress",
          run_id: runId,
          step: `iter ${i + 1}: ${toolName}`,
          pct: ((i + 1) / maxIter) * 100,
          status: "running",
        });
        const result = await executeToolCall(tc as HermesToolCall & { name: ToolExecutor });
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(resultToWire(result)),
        });
      }
      continue;
    }

    // No tool calls — the LLM emitted final text. Broadcast and exit.
    log.info({ runId, iterations: i + 1, textLen: response.text.length }, "Agentic skill run complete");
    broadcast({ type: "skill:result", run_id: runId, output: response.text || "" });
    return;
  }

  // Max iterations reached
  log.warn({ runId, maxIter }, "Agentic loop: max iterations reached");
  broadcast({ type: "skill:error", run_id: runId, error: `MAX_ITERATIONS_REACHED: ${maxIter}` });
}

// ---------------------------------------------------------------------------
// Helpers (exported for testability)
// ---------------------------------------------------------------------------

/** Build the system message that injects the skill body + args. */
export function buildSkillSystemMessage(doc: SkillDoc, args: Record<string, unknown>): string {
  return [
    `# Skill: ${doc.frontmatter.name}`,
    "",
    doc.body,
    "",
    "## Args",
    "```json",
    JSON.stringify(args, null, 2),
    "```",
  ].join("\n");
}

/**
 * The tool allow-list (C3 alignment):
 *  - The skill's declared `tools_required[]` (any of the 9 launch-set servers)
 *  - `code_exec` if the skill's category is swe or analysis (most workflow
 *    skills that need to run code fall in these buckets; part 4 §4.2's
 *    `data-analysis` and `api-integration` are the primary consumers)
 *  - Pending MCP servers (slack) are filtered out
 */
export function computeAllowedTools(doc: SkillDoc): ToolExecutor[] {
  const allowed = new Set<ToolExecutor>();
  for (const required of doc.frontmatter.tools_required) {
    const name = required as ToolExecutor;
    if (PENDING_MCP_SERVERS.includes(name as (typeof PENDING_MCP_SERVERS)[number])) {
      // Pending servers are NEVER in the allow-list (the LLM can't invoke them)
      continue;
    }
    allowed.add(name);
  }
  if (doc.frontmatter.category === "swe" || doc.frontmatter.category === "analysis") {
    allowed.add("code_exec");
  }
  return Array.from(allowed);
}

/**
 * Build the OpenRouter tool definitions for the allow-list. The §3 prelude
 * ships inline definitions; E3 (C1) can extend with proper JSON Schemas
 * for the MCP tools.
 */
export function buildToolDefinitions(
  names: ToolExecutor[],
): Array<{ type: "function"; function: { name: string; description?: string; parameters: unknown } }> {
  const defs: Array<{ type: "function"; function: { name: string; description?: string; parameters: unknown } }> = [];
  for (const name of names) {
    if (name === "code_exec") {
      defs.push({
        type: "function",
        function: {
          name: "code_exec",
          description:
            "Execute a snippet of code in a sandboxed subprocess (node, python, or bash). The subprocess has no network isolation beyond Docker's bridge; secrets are stripped from the env. 60s hard timeout. Use for data analysis, code generation, scripting.",
          parameters: {
            type: "object",
            properties: {
              code: { type: "string", description: "The code to execute" },
              language: { type: "string", enum: ["node", "python", "bash"], description: "The execution language" },
            },
            required: ["code", "language"],
          },
        },
      });
      continue;
    }
    // MCP tools — generic description. E3 (C1) can tighten with per-server JSON Schemas.
    defs.push({
      type: "function",
      function: {
        name,
        description: `Invoke a tool on the "${name}" MCP server. Tools are server-specific; see the MCP server's tool catalog. (E3 will tighten the schema with the per-server tool list.)`,
        parameters: {
          type: "object",
          properties: {
            tool: { type: "string", description: `The name of the ${name} tool to invoke` },
            args: { type: "object", description: `Arguments to pass to the ${name} tool` },
          },
          required: ["tool", "args"],
        },
      },
    });
  }
  return defs;
}

/** Convert a ToolResult into the JSON-serializable shape that goes on the wire. */
function resultToWire(result: ToolResult): unknown {
  if (result.ok) return { ok: true, output: result.output ?? null };
  return { ok: false, error: result.error ?? "unknown error", output: result.output ?? null };
}
