import type { FastifyRequest, FastifyReply } from "fastify";
import { createClient } from "@supabase/supabase-js";
import { verifyAccessToken } from "../lib/auth-verify.js";
import { env } from "../lib/env.js";
import { fail } from "../lib/response.js";

export async function tenantMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    return fail(reply, 401, "UNAUTHENTICATED", "Missing authorization header");
  }

  const token = authHeader.slice(7);

  try {
    const { tenantId, userId, role } = await verifyAccessToken(token);

    request.tenantId = tenantId;
    request.userId = userId;
    request.role = role;

    request.supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    request.supabaseAdmin = createClient(
      env.SUPABASE_URL,
      env.SUPABASE_SERVICE_ROLE_KEY
    );
  } catch (err) {
    if (err instanceof Error && err.name === "JWTExpired") {
      return fail(reply, 401, "UNAUTHENTICATED", "Token expired");
    }
    return fail(reply, 401, "UNAUTHENTICATED", "Invalid token");
  }
}
