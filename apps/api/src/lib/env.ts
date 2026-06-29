import { z } from "zod";
import { validateEncryptionKey } from "./crypto.js";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(3001),
  HOST: z.string().default("0.0.0.0"),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  JWT_SECRET: z.string().optional(), // Optional - legacy HS256
  SUPABASE_JWKS_URL: z.string().url(), // Required - always
  MASTER_ENCRYPTION_KEY: z.string().base64().min(1),
  REDIS_URL: z.string().url().optional(),
  DOCKER_HOST: z.string().optional(),
  HERMES_URL: z.string().url().default("http://hermes:8765"),
  // CORS allow-origin(s) — comma-separated. REQUIRED in production
  // (the Vercel web origin: https://jarvis.versalabs-studio.com).
  // The .refine() below fail-loud at boot if NODE_ENV=production and
  // CORS_ORIGINS is unset/empty (security-patterns: default-deny for prod).
  CORS_ORIGINS: z.string().optional(),
  // Public base URL of THIS API (used for OAuth redirects, webhook
  // callbacks, mobile deep-links). Optional in dev; recommended in prod.
  PUBLIC_API_URL: z.string().url().optional(),
  // F2 — observability. Either SENTRY_DSN or GLITCHTIP_DSN (GlitchTip is
  // Sentry-API-compatible, same DSN format) enables error capture. Both
  // optional; if unset, the Sentry plugin is a no-op.
  // #8 FIX (Phase F Stage-2): docker-compose passes SENTRY_DSN=${SENTRY_DSN:-}
  // which injects an empty string (PRESENT but EMPTY) when the host var is
  // unset. coerce empty → undefined so the .optional() contract holds.
  SENTRY_DSN: z.preprocess(v => (v === "" ? undefined : v), z.string().url().optional()),
  GLITCHTIP_DSN: z.preprocess(v => (v === "" ? undefined : v), z.string().url().optional()),
  // Sentry release tagging. Optional; defaults to "1.5.0" + NODE_ENV.
  SENTRY_ENVIRONMENT: z.string().optional(),
  SENTRY_RELEASE: z.string().optional(),
}).refine(
  (env) =>
    env.NODE_ENV !== "production" ||
    (typeof env.CORS_ORIGINS === "string" && env.CORS_ORIGINS.trim().length > 0),
  {
    message:
      "CORS_ORIGINS is required in production (the Vercel web origin, " +
      "e.g. 'https://jarvis.versalabs-studio.com').",
    path: ["CORS_ORIGINS"],
  },
);
// No refine — JWKS is always required

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function validateEnv(): Env {
  if (_env) return _env;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error("❌ Invalid environment variables:");
    console.error(result.error.flatten().fieldErrors);
    process.exit(1);
  }

  _env = result.data;

  validateEncryptionKey();

  console.log("✅ Environment validated:", {
    NODE_ENV: _env.NODE_ENV,
    PORT: _env.PORT,
    HOST: _env.HOST,
    SUPABASE_URL: _env.SUPABASE_URL,
    SUPABASE_ANON_KEY: _env.SUPABASE_ANON_KEY.slice(0, 8) + "...",
    SUPABASE_SERVICE_ROLE_KEY:
      _env.SUPABASE_SERVICE_ROLE_KEY.slice(0, 8) + "...",
    JWT_SECRET: _env.JWT_SECRET ? "***" : "not set",
    SUPABASE_JWKS_URL: _env.SUPABASE_JWKS_URL,
    MASTER_ENCRYPTION_KEY: "***",
    REDIS_URL: _env.REDIS_URL,
    DOCKER_HOST: _env.DOCKER_HOST,
    HERMES_URL: _env.HERMES_URL,
    SENTRY_DSN: _env.SENTRY_DSN ? "***" : "not set",
    GLITCHTIP_DSN: _env.GLITCHTIP_DSN ? "***" : "not set",
    SENTRY_ENVIRONMENT: _env.SENTRY_ENVIRONMENT,
    SENTRY_RELEASE: _env.SENTRY_RELEASE,
  });

  return _env;
}

export function getEnv(): Env {
  // Self-initialize: ESM evaluates imported module bodies before the importer's
  // body, so a module accessing `env` at import-time (e.g. auth-verify's JWKS)
  // can run before server.ts calls validateEnv(). Validate on first access.
  return _env ?? validateEnv();
}

export const env = new Proxy({} as Env, {
  get(_target, prop) {
    return getEnv()[prop as keyof Env];
  },
});

/**
 * Test-only escape hatch. Clears the cached env so the next
 * `validateEnv()` (or any `env.X` read) re-parses `process.env`. Not
 * for production use.
 */
export function _resetEnvForTest(): void {
  _env = null;
}
