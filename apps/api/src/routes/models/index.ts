import type { FastifyInstance } from "fastify";
import { ok, fail } from "../../lib/response.js";
import { env } from "../../lib/env.js";

let modelCache: { data: unknown; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

export async function modelsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get("/api/models", async (request, reply) => {
    if (modelCache && Date.now() - modelCache.timestamp < CACHE_TTL) {
      return ok(reply, modelCache.data);
    }

    try {
      const hermesUrl = env.HERMES_URL || "http://hermes:8765";
      const response = await fetch(`${hermesUrl}/v1/models`, {
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        return fail(reply, 502, "UPSTREAM_ERROR", "Failed to fetch models from Hermes");
      }

      const data = await response.json();
      modelCache = { data, timestamp: Date.now() };
      return ok(reply, data);
    } catch (err) {
      console.error("Models proxy error:", err);
      return fail(reply, 502, "UPSTREAM_ERROR", "Hermes unreachable");
    }
  });
}
