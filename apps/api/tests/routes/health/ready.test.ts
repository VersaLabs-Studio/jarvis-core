// =============================================================================
// Tests for the /ready endpoint (F2).
//
// Verifies:
//   - 200 OK when both redis and supabase are reachable
//   - 503 Service Unavailable when either check is down
//   - The response shape includes `status`, `version`, `checks: { redis, supabase }`
//   - Latency is measured
//   - The endpoint is auth-free (no Authorization header required)
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Fastify from "fastify";

// Mock the pingRedis lib so we can control its output.
const pingRedisMock = vi.fn();
vi.mock("../../../src/lib/redis.js", () => ({
  pingRedis: (...args: unknown[]) => pingRedisMock(...args),
}));

// Mock the env so we have a stable SUPABASE_JWKS_URL.
vi.mock("../../../src/lib/env.js", () => ({
  env: {
    SUPABASE_JWKS_URL: "https://example.supabase.co/auth/v1/.well-known/jwks.json",
  },
}));

import { readyRoute } from "../../../src/routes/health/ready.js";

const REAL_FETCH = globalThis.fetch;

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  globalThis.fetch = REAL_FETCH;
  vi.restoreAllMocks();
});

function makeApp() {
  const app = Fastify({ logger: false });
  return app.register(readyRoute).then(() => app);
}

describe("GET /ready (F2 — readiness)", () => {
  it("returns 200 with status:ready when both redis and supabase are reachable", async () => {
    pingRedisMock.mockResolvedValue({ ok: true, latency_ms: 1 });
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(null, { status: 200 }),
    ) as unknown as typeof fetch;

    const app = await makeApp();
    const res = await app.inject({ method: "GET", url: "/ready" });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { status: string; version: string; checks: { redis: { ok: boolean }; supabase: { ok: boolean } } };
    expect(body.status).toBe("ready");
    expect(body.version).toBeDefined();
    expect(body.checks.redis.ok).toBe(true);
    expect(body.checks.supabase.ok).toBe(true);
    await app.close();
  });

  it("returns 503 when redis is unreachable (REDIS_URL unset or ping fails)", async () => {
    pingRedisMock.mockResolvedValue({ ok: false, error: "REDIS_URL not set" });
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(null, { status: 200 }),
    ) as unknown as typeof fetch;

    const app = await makeApp();
    const res = await app.inject({ method: "GET", url: "/ready" });
    expect(res.statusCode).toBe(503);
    const body = res.json() as { status: string; checks: { redis: { ok: boolean; error?: string } } };
    expect(body.status).toBe("not_ready");
    expect(body.checks.redis.ok).toBe(false);
    expect(body.checks.redis.error).toContain("REDIS_URL");
    await app.close();
  });

  it("returns 503 when Supabase JWKS is unreachable", async () => {
    pingRedisMock.mockResolvedValue({ ok: true });
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED")) as unknown as typeof fetch;

    const app = await makeApp();
    const res = await app.inject({ method: "GET", url: "/ready" });
    expect(res.statusCode).toBe(503);
    const body = res.json() as { status: string; checks: { supabase: { ok: boolean; error?: string } } };
    expect(body.status).toBe("not_ready");
    expect(body.checks.supabase.ok).toBe(false);
    expect(body.checks.supabase.error).toContain("ECONNREFUSED");
    await app.close();
  });

  it("returns 503 when Supabase JWKS returns a 5xx", async () => {
    pingRedisMock.mockResolvedValue({ ok: true });
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response("server error", { status: 500 }),
    ) as unknown as typeof fetch;

    const app = await makeApp();
    const res = await app.inject({ method: "GET", url: "/ready" });
    expect(res.statusCode).toBe(503);
    const body = res.json() as { checks: { supabase: { ok: boolean; error?: string } } };
    expect(body.checks.supabase.ok).toBe(false);
    expect(body.checks.supabase.error).toContain("HTTP 500");
    await app.close();
  });

  it("is auth-free (no Authorization header required)", async () => {
    pingRedisMock.mockResolvedValue({ ok: true });
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(null, { status: 200 }),
    ) as unknown as typeof fetch;

    const app = await makeApp();
    // No Authorization header — /ready should still respond.
    const res = await app.inject({ method: "GET", url: "/ready" });
    expect(res.statusCode).toBe(200);
    await app.close();
  });

  it("includes latency_ms for every check", async () => {
    pingRedisMock.mockResolvedValue({ ok: true, latency_ms: 5 });
    globalThis.fetch = vi.fn().mockImplementation(async () => {
      // Simulate a slow Supabase response.
      await new Promise((r) => setTimeout(r, 10));
      return new Response(null, { status: 200 });
    }) as unknown as typeof fetch;

    const app = await makeApp();
    const res = await app.inject({ method: "GET", url: "/ready" });
    const body = res.json() as { checks: { redis: { latency_ms: number }; supabase: { latency_ms: number } } };
    expect(typeof body.checks.redis.latency_ms).toBe("number");
    expect(typeof body.checks.supabase.latency_ms).toBe("number");
    expect(body.checks.supabase.latency_ms).toBeGreaterThanOrEqual(10);
    await app.close();
  });
});
