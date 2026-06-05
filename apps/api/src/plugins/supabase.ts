import type { FastifyInstance } from "fastify";
import { createClient } from "@supabase/supabase-js";
import { env } from "../lib/env.js";

export async function supabasePlugin(fastify: FastifyInstance): Promise<void> {
  const adminClient = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
  );

  fastify.decorate("supabaseAdmin", adminClient);

  fastify.addHook("onRequest", async (request) => {
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      request.supabase = createClient(
        env.SUPABASE_URL,
        env.SUPABASE_ANON_KEY,
        {
          global: { headers: { Authorization: `Bearer ${token}` } },
        }
      );
    }
  });
}
