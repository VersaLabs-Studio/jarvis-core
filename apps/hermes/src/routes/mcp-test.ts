// =============================================================================
// POST /v1/mcp/test — probe an MCP server.
//
// E0 stub: returns `{ ok: false, error: "MCP not configured" }` for any
// server. E3 wires the real probes by talking to the pinned MCP image
// over its stdio/JSON-RPC interface.
//
// Server allow-list matches Part 4 §4.6 launch set: github, vercel,
// notion, supabase, filesystem, browser, gmail, slack, linear. Anything
// not in the list returns the same "not configured" response.
// =============================================================================

import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { fail, ok } from "../lib/response.js";
import { isDockerControlEnabled } from "../lib/docker-control.js";
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
    // E0: no MCP image is configured. E3 will replace this with a stdio probe.
    if (!isDockerControlEnabled()) {
      const response: McpTestResponse = {
        server,
        ok: false,
        error: "MCP not configured (E0: docker-control disabled; E3 will wire the pinned MCP image)",
      };
      return ok(reply, response);
    }
    const response: McpTestResponse = {
      server,
      ok: false,
      error: "MCP not configured (E0 stub — E3 wires the real probe)",
    };
    return ok(reply, response);
  });
}
