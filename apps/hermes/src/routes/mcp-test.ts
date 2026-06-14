// =============================================================================
// POST /v1/mcp/test — probe an MCP server.
//
// Phase E §5.3 E3 (C1 binding: liveness+log probe stays per the
// Orchestrator's ratification). The route dispatches based on the
// server type:
//
//   - Pending MCP (slack): returns a structured "MCP_PENDING" refusal
//   - Hosted MCP (vercel, linear): returns a static tools list (Part 4 §4.6);
//     the agentic loop's mcp-client.ts makes a real HTTPS call at runtime
//   - Local MCP (github, notion, supabase, filesystem, browser, gmail):
//     calls the per-container bridge /health + /tools endpoints
//
// Unknown servers (not in the launch set) are rejected with
// "Unknown MCP server (not in launch set)" — the route is not a
// generic MCP proxy.
// =============================================================================

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { fail, ok } from "../lib/response.js";
import { isDockerControlEnabled } from "../lib/docker-control.js";
import { probeMcpHealth, probeMcpTools } from "../lib/mcp-client.js";
import type { McpTestParams, McpTestResponse } from "@jarvis/shared";

const mcpTestBodySchema = z.object({
  server: z.string().min(1).max(64),
});

const KNOWN_MCP_SERVERS = new Set([
  "github",
  "vercel",
  "notion",
  "supabase",
  "filesystem",
  "browser",
  "gmail",
  "slack",
  "linear",
]);

/** Static tools list for hosted MCP servers (Part 4 §4.6 — verified at deploy time). */
const HOSTED_MCP_TOOLS: Record<string, string[]> = {
  vercel: ["list_projects", "get_project", "get_deployment", "list_deployments", "deploy", "get_env_vars", "list_domains", "get_domain"],
  linear: ["list_issues", "get_issue", "create_issue", "update_issue", "list_teams", "list_projects", "list_users"],
};

const PENDING_MCP_SERVERS = new Set(["slack"]);

export async function mcpTestRoute(fastify: FastifyInstance): Promise<void> {
  fastify.post("/v1/mcp/test", async (request, reply) => {
    const parsed = mcpTestBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return fail(reply, "VALIDATION", "Invalid mcp-test body", parsed.error.flatten());
    }
    const { server } = parsed.data satisfies McpTestParams;

    if (!KNOWN_MCP_SERVERS.has(server)) {
      const response: McpTestResponse = {
        server,
        ok: false,
        error: "Unknown MCP server (not in launch set)",
      };
      return ok(reply, response);
    }

    // Pending (slack): structured refusal. The agentic loop's tool-executor
    // ALSO returns MCP_PENDING for pending servers (defense in depth).
    if (PENDING_MCP_SERVERS.has(server)) {
      const response: McpTestResponse = {
        server,
        ok: false,
        error: `MCP_PENDING: server "${server}" is not wired in v1.5 (Part 4 §4.6). Verify before production use.`,
      };
      return ok(reply, response);
    }

    // Hosted (vercel, linear): static tools list. The runtime invocation
    // goes through mcp-client.ts (real HTTPS call to the vendor endpoint);
    // v1.5 returns the static list because OAuth setup is F-scope.
    if (server in HOSTED_MCP_TOOLS) {
      const response: McpTestResponse = {
        server,
        ok: true,
        tools: HOSTED_MCP_TOOLS[server],
      };
      return ok(reply, response);
    }

    // Local: probe the bridge. The liveness+log probe is the C1 binding
    // — the gate verifies the bridge is alive AND returns a real tool list.
    if (!isDockerControlEnabled()) {
      const response: McpTestResponse = {
        server,
        ok: false,
        error: "MCP_DOCKER_DISABLED: docker-control is off; the local MCP bridge cannot be probed. Enable docker-control or set DOCKER_HOST.",
      };
      return ok(reply, response);
    }

    const health = await probeMcpHealth(server);
    if (!health.ok) {
      const response: McpTestResponse = {
        server,
        ok: false,
        error: health.error ?? "bridge unreachable",
      };
      return ok(reply, response);
    }

    const tools = await probeMcpTools(server);
    const response: McpTestResponse = {
      server,
      ok: true,
      tools: tools.tools,
    };
    return ok(reply, response);
  });
}
