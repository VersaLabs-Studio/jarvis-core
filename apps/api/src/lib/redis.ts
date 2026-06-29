// =============================================================================
// Minimal ioredis client for the API (F2 — /ready endpoint).
//
// Lazy singleton; constructed on first use; only attempts a connection
// when REDIS_URL is set. If REDIS_URL is unset, `getRedis()` returns
// null and the /ready endpoint reports `{ok: false, reason: "no-redis"}`
// (Redis is optional in v1.5 — used by the budget gate + cron in
// Hermes, not by the API itself for normal traffic).
//
// We do NOT use this redis for application reads/writes; the API talks
// to Supabase for state. This client exists solely to answer /ready.
// =============================================================================

import { Redis } from "ioredis";
import { env } from "./env.js";

let _redis: Redis | null = null;
let _initAttempted = false;

export function getRedis(): Redis | null {
  if (_initAttempted) return _redis;
  _initAttempted = true;
  if (!env.REDIS_URL) {
    return null;
  }
  try {
    _redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      connectTimeout: 3_000,
      // We don't want ioredis to keep retrying forever; /ready needs a
      // quick verdict.
      retryStrategy: () => null,
      lazyConnect: true,
    });
    _redis.on("error", () => {
      // Don't crash the API on a transient redis blip; /ready will
      // report the failure.
    });
  } catch {
    _redis = null;
  }
  return _redis;
}

/** Best-effort PING; resolves to true if the server replied PONG. */
export async function pingRedis(): Promise<{ ok: boolean; error?: string }> {
  const r = getRedis();
  if (!r) {
    return { ok: false, error: "REDIS_URL not set" };
  }
  try {
    if (r.status === "wait" || r.status === "end") {
      await r.connect();
    }
    const reply = await r.ping();
    return { ok: reply === "PONG" };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  } finally {
    if (r.status !== "ready" && r.status !== "connecting") {
      r.disconnect();
      _redis = null;
      _initAttempted = true; // next call will retry the connection
    }
  }
}
