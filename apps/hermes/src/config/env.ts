// =============================================================================
// Hermes env validation (Zod).
// Boots fail loudly on missing/invalid — never half-configured.
// =============================================================================

import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(8765),
  HOST: z.string().default("0.0.0.0"),

  // OpenRouter (required at boot — C5 fix; primary model ping fails without it)
  OPENROUTER_API_KEY: z.string().min(20, "OPENROUTER_API_KEY required"),

  // Redis (optional in dev; required for budget tracking + cron E4).
  // No-refusal: if unset, budget is a no-op and cron is disabled.
  REDIS_URL: z.string().url().optional(),

  // Docker control — must point to the socket proxy (H1).
  // If unset, docker-control.ts refuses to start.
  DOCKER_HOST: z.string().url().optional(),

  // Skill docs location (mount point in container; repo path in dev)
  SKILLS_DIR: z.string().default("/app/data/skills"),

  // Daily budget gate (Part 1 §1.5)
  HERMES_DAILY_BUDGET_USD: z.coerce.number().min(0).default(0.5),

  // Boot-check interval (5 minutes default)
  BOOT_CHECK_INTERVAL_MS: z.coerce.number().int().min(1000).default(300_000),

  // Per-model call timeout (60s default; Part 1 §1.5)
  MODEL_CALL_TIMEOUT_MS: z.coerce.number().int().min(1000).default(60_000),

  // E4 cron engine — API endpoint for workflow_runs writes
  // (HTTP loopback; the API exposes the factory CRUD).
  API_URL: z.string().url().optional(),
  HERMES_SERVICE_TOKEN: z.string().optional(),

  // F2 — observability. Either SENTRY_DSN or GLITCHTIP_DSN enables
  // error capture. Both optional; if unset, the Sentry plugin is a
  // no-op.
  // #8 FIX (Phase F Stage-2): docker-compose passes SENTRY_DSN=${SENTRY_DSN:-}
  // which injects an empty string (PRESENT but EMPTY) when the host var is
  // unset. coerce empty → undefined so the .optional() contract holds.
  SENTRY_DSN: z.preprocess(v => (v === "" ? undefined : v), z.string().url().optional()),
  GLITCHTIP_DSN: z.preprocess(v => (v === "" ? undefined : v), z.string().url().optional()),
  SENTRY_ENVIRONMENT: z.string().optional(),
  SENTRY_RELEASE: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function validateEnv(): Env {
  if (_env) return _env;
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    // eslint-disable-next-line no-console
    console.error("❌ Invalid Hermes environment variables:");
    // eslint-disable-next-line no-console
    console.error(result.error.flatten().fieldErrors);
    process.exit(1);
  }
  _env = result.data;
  return _env;
}

export function getEnv(): Env {
  return _env ?? validateEnv();
}

/**
 * Test-only escape hatch. Clears the cached env so the next
 * `validateEnv()` (or any `env.X` read) re-parses `process.env`. Not
 * for production use.
 */
export function _resetEnvForTest(): void {
  _env = null;
}
