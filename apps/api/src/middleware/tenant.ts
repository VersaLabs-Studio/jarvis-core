import type { FastifyRequest, FastifyReply } from "fastify";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseJwtPayload } from "../types/auth.js";
import { env } from "../lib/env.js";
import { fail } from "../lib/response.js";

// Create JWKS remote set (cached internally by jose)
const JWKS = createRemoteJWKSet(new URL(env.SUPABASE_JWKS_URL));

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
    // ✅ VERIFY signature with JWKS (asymmetric ES256)
    const { payload } = await jwtVerify(token, JWKS, {
      algorithms: ["ES256"],
      audience: "authenticated",
      issuer: `${env.SUPABASE_URL}/auth/v1`,
    });

    const decoded = payload as unknown as SupabaseJwtPayload;

    // ✅ Read tenant_id from ROOT level (matches hook + RLS)
    const tenantId = decoded.tenant_id;
    if (!tenantId) {
      return fail(
        reply,
        403,
        "FORBIDDEN",
        "No tenant associated with this token"
      );
    }

    // Set context from verified JWT (no network call needed)
    request.tenantId = tenantId;
    request.userId = decoded.sub;
    request.role = decoded.app_metadata?.role || "member";

    // Build RLS-scoped anon client with user's Bearer token
    request.supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    // Admin client for service operations
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
