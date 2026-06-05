import { beforeAll } from "vitest";

beforeAll(() => {
  if (!process.env.SUPABASE_URL) {
    process.env.SUPABASE_URL = "http://localhost:54321";
  }
  if (!process.env.SUPABASE_ANON_KEY) {
    process.env.SUPABASE_ANON_KEY = "test-anon-key";
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-role-key";
  }
  if (!process.env.SUPABASE_JWKS_URL) {
    process.env.SUPABASE_JWKS_URL = "http://localhost:54321/auth/v1/jwks";
  }
  if (!process.env.MASTER_ENCRYPTION_KEY) {
    process.env.MASTER_ENCRYPTION_KEY = Buffer.from("test-key-32-bytes-long-for-aes!!").toString("base64");
  }
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = "test-jwt-secret";
  }
});
