import type { SupabaseClient } from "@supabase/supabase-js";

declare module "fastify" {
  interface FastifyRequest {
    userId: string;
    tenantId: string;
    role: string;
    supabase: SupabaseClient;
    supabaseAdmin: SupabaseClient;
  }

  interface FastifyInstance {
    supabaseAdmin: SupabaseClient;
  }
}
