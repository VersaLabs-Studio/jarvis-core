// =============================================================================
// GET /ready — F2 readiness endpoint.
//
// Answers "is this API process ready to serve traffic?" with a quick
// rollup of the outbound dependencies. Auth-free (same as /health).
//
//   200 OK  → { status: "ready",     checks: { redis, supabase } }
//   503 SE  → { status: "not_ready", checks: { redis, supabase } }
//
// Each check has `{ ok: boolean, latency_ms?: number, error?: string }`.
// Latency is measured in-process; a 3s timeout caps each individual
// check so the overall response is bounded.
//
// Why a separate endpoint from /health:
//   /health = "the process is up" (liveness; orchestrator restart signal)
//   /ready  = "the dependencies I need are reachable" (readiness;
//             orchestrator route-traffic signal)
// Kubernetes / docker compose healthchecks conventionally map these to
// liveness vs readiness probes. We have one orchestrator (docker compose
// healthcheck) that uses /health; the operator can wire /ready into
// their own load balancer / monitoring separately.
// =============================================================================

import type { FastifyInstance } from "fastify";
import { pingRedis } from "../../lib/redis.js";
import { env } from "../../lib/env.js";

const CHECK_TIMEOUT_MS = 3_000;

interface CheckResult {
  ok: boolean;
  latency_ms: number;
  error?: string;
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return await Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms)),
  ]);
}

async function checkSupabase(): Promise<CheckResult> {
  const startedAt = Date.now();
  try {
    // The JWKS endpoint is public (no auth required) and hosted —
    // exactly the surface we want to probe. A 200 = reachable.
    const res = await withTimeout(
      fetch(env.SUPABASE_JWKS_URL, { method: "HEAD", signal: AbortSignal.timeout(CHECK_TIMEOUT_MS) }),
      CHECK_TIMEOUT_MS,
    );
    return {
      ok: res.ok,
      latency_ms: Date.now() - startedAt,
      error: res.ok ? undefined : `HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      ok: false,
      latency_ms: Date.now() - startedAt,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function readyRoute(fastify: FastifyInstance): Promise<void> {
  fastify.get("/ready", async (_request, reply) => {
    const [redis, supabase] = await Promise.all([pingRedis(), checkSupabase()]);
    const allOk = redis.ok && supabase.ok;
    const payload = {
      status: allOk ? "ready" : "not_ready",
      version: "1.5.0",
      checks: { redis, supabase },
    };
    return reply.code(allOk ? 200 : 503).send(payload);
  });
}
