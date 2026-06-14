// =============================================================================
// MCP client (Phase E §5.3 E3 — C1 binding: real stdio invocation).
//
// Calls a per-server MCP bridge over HTTP. The bridge is a Docker container
// running a stdio MCP server + an HTTP-to-stdio adapter
// (apps/mcp/src/bridge.js). Per-server URLs are resolved from the container
// hostname on the jarvis-internal network (e.g. `mcp-github:8765`).
//
// C1 closure: this is REAL stdio invocation. The bridge uses
// @modelcontextprotocol/sdk's StdioClientTransport to forward the request
// to the npm MCP server (which speaks stdio JSON-RPC). The result is the
// real tool output.
//
// Hosted servers (vercel, linear): real HTTPS call to the vendor's MCP
// endpoint. v1.5 supports the call shape; OAuth setup is F-scope.
//
// Slack: returns a "MCP_PENDING" refusal (Part 4 §4.6 — archived upstream;
// verify before wiring). Handled in tool-executor.ts via PENDING_MCP_SERVERS.
// =============================================================================

import { log } from "./logger.js";

/** Default port the bridge listens on (set in apps/mcp/Dockerfile). */
const MCP_BRIDGE_PORT = 8765;

/** Per-call timeout (ms). 30s is generous for most MCP tool calls. */
const MCP_TIMEOUT_MS = 30_000;

/**
 * Resolve the MCP endpoint URL for a given server. Local servers route to
 * the per-container bridge on the jarvis-internal network; hosted servers
 * route to the vendor's HTTPS MCP endpoint.
 */
function resolveMcpUrl(server: string, path: string): string {
  // Hosted servers
  if (server === "vercel") return `https://mcp.vercel.com${path}`;
  if (server === "linear") return `https://mcp.linear.app${path}`;
  // Local server (bridge in the jarvis-internal Docker network)
  return `http://mcp-${server}:${MCP_BRIDGE_PORT}${path}`;
}

export interface McpCallArgs {
  /** The tool name (e.g. "create_pull_request", "list_messages"). */
  tool: string;
  /** Arguments to pass to the tool. */
  args: Record<string, unknown>;
}

export interface McpCallResult {
  ok: boolean;
  /** Tool output (when ok: true). */
  output?: unknown;
  /** Error message (when ok: false). */
  error?: string;
}

/**
 * Call a tool on the MCP bridge for the given server.
 * Returns a structured McpCallResult; the agentic loop feeds the result
 * back to the LLM as a `tool` message.
 */
export async function callMcpTool(server: string, args: McpCallArgs): Promise<McpCallResult> {
  const url = resolveMcpUrl(server, "/call");
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), MCP_TIMEOUT_MS);

  try {
    log.info({ server, tool: args.tool, url }, "MCP tool call dispatching to bridge");
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: args.tool, arguments: args.args }),
      signal: controller.signal,
    });
    clearTimeout(timeoutHandle);

    if (!response.ok) {
      const text = await response.text().catch(() => "unknown");
      return {
        ok: false,
        error: `MCP_BRIDGE_${response.status}: ${text.slice(0, 200)}`,
      };
    }
    const result = (await response.json()) as { ok: boolean; result?: unknown; error?: string };
    if (!result.ok) {
      return { ok: false, error: result.error ?? "unknown MCP error" };
    }
    return { ok: true, output: result.result };
  } catch (err) {
    clearTimeout(timeoutHandle);
    if (err instanceof Error && err.name === "AbortError") {
      return {
        ok: false,
        error: `MCP_BRIDGE_TIMEOUT: ${server} did not respond in ${MCP_TIMEOUT_MS}ms`,
      };
    }
    return {
      ok: false,
      error: `MCP_BRIDGE_UNREACHABLE: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Liveness probe for the per-server MCP bridge.
 * Returns the bridge's /health response, or an error if the bridge is
 * unreachable. Used by the /v1/mcp/test route.
 */
export interface McpHealthResult {
  ok: boolean;
  server: string;
  uptime_s?: number;
  tool_count?: number;
  last_refresh?: string | null;
  last_refresh_error?: string | null;
  error?: string;
}

export async function probeMcpHealth(server: string): Promise<McpHealthResult> {
  const url = resolveMcpUrl(server, "/health");
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), 5_000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutHandle);
    if (!response.ok) {
      return { ok: false, server, error: `MCP_HEALTH_${response.status}` };
    }
    return (await response.json()) as McpHealthResult;
  } catch (err) {
    clearTimeout(timeoutHandle);
    return {
      ok: false,
      server,
      error: err instanceof Error ? err.name === "AbortError" ? "MCP_HEALTH_TIMEOUT" : err.message : String(err),
    };
  }
}

/**
 * Tool list probe for the per-server MCP bridge.
 * Returns the cached `tools/list` from the bridge, or an error if
 * unreachable. Used by the /v1/mcp/test route.
 */
export interface McpToolsResult {
  tools: string[];
  last_refresh?: string | null;
  last_refresh_error?: string | null;
  error?: string;
}

export async function probeMcpTools(server: string): Promise<McpToolsResult> {
  const url = resolveMcpUrl(server, "/tools");
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), 5_000);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutHandle);
    if (!response.ok) {
      return { tools: [], error: `MCP_TOOLS_${response.status}` };
    }
    return (await response.json()) as McpToolsResult;
  } catch (err) {
    clearTimeout(timeoutHandle);
    return {
      tools: [],
      error: err instanceof Error ? err.name === "AbortError" ? "MCP_TOOLS_TIMEOUT" : err.message : String(err),
    };
  }
}
