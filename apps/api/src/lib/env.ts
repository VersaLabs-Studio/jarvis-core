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
  CORS_ORIGINS: z.string().optional(),
});
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
  });

  return _env;
}

export function getEnv(): Env {
  if (!_env) {
    throw new Error("Env not validated. Call validateEnv() first.");
  }
  return _env;
}

export const env = new Proxy({} as Env, {
  get(_target, prop) {
    return getEnv()[prop as keyof Env];
  },
});
