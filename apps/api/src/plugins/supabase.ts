// #9 FIX (Phase F Stage-2): supabase-js@2 eagerly builds its realtime client
// inside createClient, which requires a WebSocket implementation. Native
// WebSocket only exists on Node ≥21; this polyfill bridges Node 20.
import { WebSocket } from "ws";
(globalThis as any).WebSocket ??= WebSocket;

import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import { createClient } from "@supabase/supabase-js";
import { env } from "../lib/env.js";

export const supabasePlugin = fp(async function supabasePlugin(fastify: FastifyInstance): Promise<void> {
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
});
