// =============================================================================
// Hermes constants — error codes, timeouts, defaults. Centralized so the
// Audit + the resolver can grep one file.
// =============================================================================

import type { HermesErrorCode } from "@jarvis/shared";

/**
 * Mapping from Hermes internal error codes to HTTP status codes surfaced
 * on the /v1/* endpoints. Mirrors the api envelope (Part 2 §2.5).
 *
 * Most Hermes errors are 502 (UPSTREAM_ERROR) because the proximate cause
 * is always a third-party (OpenRouter or an MCP server).
 */
export const HERMES_ERROR_STATUS: Record<HermesErrorCode, number> = {
  CHAIN_EXHAUSTED: 502,
  MODEL_NOT_FOUND: 502,
  BUDGET_EXHAUSTED: 429,
  TIMEOUT: 504,
  VALIDATION: 422,
  UPSTREAM_ERROR: 502,
  INTERNAL: 500,
  SKILL_NOT_FOUND: 404,
  SKILL_MALFORMED: 500,
  MCP_NOT_CONFIGURED: 503,
  SANDBOX_DENIED: 403,
};

/**
 * How long Hermes waits for each model in the chain before moving to the
 * next. 60s matches the per-model timeout in env.ts.
 */
export const PER_MODEL_TIMEOUT_MS = 60_000;

/**
 * Hard cap on a single chat call across the whole chain. 180s = 3 models × 60s.
 */
export const CHAIN_TOTAL_TIMEOUT_MS = 180_000;

/**
 * Skill doc loader: maximum doc size (bytes). Defends against a runaway
 * skill doc eating memory. 256KB is plenty for a multi-step skill.
 */
export const MAX_SKILL_DOC_BYTES = 256 * 1024;

/**
 * Skill-run: max concurrent sub-agents per Hermes instance. Part 1 §1.5
 * sets this to 3.
 */
export const MAX_CONCURRENT_SKILL_RUNS = 3;

/**
 * Sub-agent code-exec hard timeout (5 minutes per Part 1 §1.5).
 */
export const SUB_AGENT_TIMEOUT_MS = 300_000;
