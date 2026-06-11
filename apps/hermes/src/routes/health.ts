// =============================================================================
// GET /health — liveness + model catalog + sandbox status
// =============================================================================

import type { FastifyInstance } from "fastify";
import { ok } from "../lib/response.js";
import { getResolved } from "../lib/model-resolver.js";
import { log } from "../lib/logger.js";
import type { HermesHealth, HermesRole } from "@jarvis/shared";

const BOOT_TIME_MS = Date.now();

export async function healthRoute(fastify: FastifyInstance): Promise<void> {
  fastify.get("/health", async (_request, reply) => {
    try {
      const resolved = getResolved();
      const status: HermesHealth = {
        status: "ok",
        model: resolved.coding.primary.resolved,
        uptime_s: Math.floor((Date.now() - BOOT_TIME_MS) / 1000),
        resolved_models: {
          planning: resolved.planning,
          coding: resolved.coding,
          office: resolved.office,
          fast: resolved.fast,
          audit: resolved.audit,
        },
        sandbox: { code: "ok" },
        boot_check: "ok",
      };
      return ok(reply, status);
    } catch (err) {
      log.error({ err: err instanceof Error ? err.message : String(err) }, "Health check failed");
      const status: HermesHealth = {
        status: "starting",
        model: "unresolved",
        uptime_s: Math.floor((Date.now() - BOOT_TIME_MS) / 1000),
        resolved_models: {
          planning: emptyChain(),
          coding: emptyChain(),
          office: emptyChain(),
          fast: emptyChain(),
          audit: emptyChain(),
        },
        sandbox: { code: "ok" },
        boot_check: "pending",
      };
      return reply.code(503).send({ ok: false, data: status });
    }
  });
}

function emptyChain() {
  return {
    primary: { configured: "", resolved: "", autoCorrected: false, candidatesTried: [] },
    fallback: [],
    missing: [],
  };
}

// HermesRole type is used implicitly by the resolved_models structure above.
// Re-exporting ensures the import isn't elided.
export type _HermesRoleRef = HermesRole;
