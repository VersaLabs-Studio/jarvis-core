import type { FastifyRequest, FastifyReply } from "fastify";
import { createClient } from "@supabase/supabase-js";
import { env } from "../lib/env.js";
import { fail } from "../lib/response.js";

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return fail(reply, 401, "UNAUTHENTICATED", "Missing authorization header");
  }

  const token = authHeader.slice(7);

  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);

  if (error || !user) {
    return fail(reply, 401, "UNAUTHENTICATED", "Invalid token");
  }

  request.userId = user.id;
  request.supabase = supabase;
  request.supabaseAdmin = createClient(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY
  );
}
