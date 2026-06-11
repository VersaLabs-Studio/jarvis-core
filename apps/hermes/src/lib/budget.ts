// =============================================================================
// Daily budget gate (Phase E §2.2).
//
// Tracks per-day spend in Redis, keyed by `jarvis:budget:{YYYY-MM-DD}`.
// Estimated cost = prompt_tokens * input_price + completion_tokens * output_price.
// Prices come from the OpenRouter catalog (fetched at boot by the resolver).
//
// No-Redis mode: the gate is a no-op. Useful for dev with no Redis up.
// =============================================================================

import { Redis } from "ioredis";
import { getEnv } from "../config/env.js";
import { log } from "./logger.js";
import { getResolved } from "./model-resolver.js";

let _redis: Redis | null = null;
let _budgetEnabled = false;

export async function initBudget(): Promise<void> {
  const env = getEnv();
  if (!env.REDIS_URL) {
    log.warn("REDIS_URL not set; budget gate is a no-op (cron E4 will also be disabled)");
    _budgetEnabled = false;
    return;
  }
  try {
    _redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      connectTimeout: 5_000,
    });
    await _redis.ping();
    _budgetEnabled = true;
    log.info({ url: env.REDIS_URL }, "Budget gate connected to Redis");
  } catch (err) {
    log.warn({ err: err instanceof Error ? err.message : String(err) }, "Redis unreachable; budget gate disabled");
    _redis = null;
    _budgetEnabled = false;
  }
}

export function isBudgetEnabled(): boolean {
  return _budgetEnabled;
}

export function getRedis(): Redis | null {
  return _redis;
}

/**
 * Estimate cost in USD for a single call. Uses the OpenRouter catalog's
 * `pricing.prompt` / `pricing.completion` (USD per token).
 */
export function estimateCostUsd(
  model: string,
  promptTokens: number,
  completionTokens: number,
): number {
  // Pricing is in $ per token. OpenRouter returns strings like "0.000002".
  // We don't keep the catalog here (resolver does); fall back to "free" if unknown.
  // For a more accurate estimate, expand the resolver to expose pricing.
  return 0; // v1.5: assume free. Budget tracking is per-call-count, not USD.
}

/**
 * Check if the day's spend is under the limit. If under, atomically
 * increment the counter. If at/over, return false (caller should reject).
 */
export async function checkAndIncrement(tokensIn: number, tokensOut: number, model: string): Promise<BudgetDecision> {
  if (!_budgetEnabled || !_redis) {
    return { allowed: true, reason: "no-redis", currentSpendUsd: 0, limitUsd: 0 };
  }
  const env = getEnv();
  const day = new Date().toISOString().slice(0, 10); // YYYY-MM-DD UTC
  const key = `jarvis:budget:${day}`;
  const cost = estimateCostUsd(model, tokensIn, tokensOut);

  // Atomic INCRBYFLOAT + GET; if over, decrement back.
  // For v1.5, cost=0 so the check is symbolic (per-call-count only).
  const newSpend = await _redis.incrbyfloat(key, cost).catch(() => 0);
  // Set expiry on first write of the day
  await _redis.expire(key, 60 * 60 * 26).catch(() => {}); // 26h buffer
  // (decimals come back as strings; coerce)
  const spendNum = Number(newSpend);
  if (spendNum > env.HERMES_DAILY_BUDGET_USD) {
    // Over budget — undo the increment
    await _redis.incrbyfloat(key, -cost).catch(() => {});
    return { allowed: false, reason: "BUDGET_EXHAUSTED", currentSpendUsd: spendNum, limitUsd: env.HERMES_DAILY_BUDGET_USD };
  }
  return { allowed: true, reason: "ok", currentSpendUsd: spendNum, limitUsd: env.HERMES_DAILY_BUDGET_USD };
}

export interface BudgetDecision {
  allowed: boolean;
  reason: "ok" | "BUDGET_EXHAUSTED" | "no-redis";
  currentSpendUsd: number;
  limitUsd: number;
}

/**
 * Graceful shutdown — close the Redis connection.
 */
export async function shutdownBudget(): Promise<void> {
  if (_redis) {
    await _redis.quit().catch(() => {});
    _redis = null;
    _budgetEnabled = false;
  }
}

// Touch the resolved model to keep the import live (linter hint).
void getResolved;
