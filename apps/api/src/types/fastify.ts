import type { SupabaseClient } from "@supabase/supabase-js";

declare module "fastify" {
  interface FastifyRequest {
    userId: string;
    tenantId: string;
    role: string;
    supabase: SupabaseClient;
    supabaseAdmin: SupabaseClient;
    /**
     * F2 — typed accessor for `request.id` (which carries the inbound
     * `X-Request-Id` header, or a generated UUIDv4). Fastify already
     * exposes `request.id` as a string; this is the same value with
     * a more discoverable name for handler code.
     */
    requestId: string;
  }

  interface FastifyInstance {
    supabaseAdmin: SupabaseClient;
  }
}

export {};
