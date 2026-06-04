import { beforeAll } from "vitest";

beforeAll(() => {
  if (!process.env.SUPABASE_URL) {
    process.env.SUPABASE_URL = "http://localhost:54321";
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("SUPABASE_SERVICE_ROLE_KEY not set — tests will skip");
  }
  if (!process.env.JWT_SECRET) {
    console.warn("JWT_SECRET not set — claim flow tests will use fallback");
  }
});
