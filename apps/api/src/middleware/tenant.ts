import type { FastifyRequest, FastifyReply } from "fastify";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { SupabaseJwtPayload } from "../types/auth.js";
import { env } from "../lib/env.js";
import { fail } from "../lib/response.js";

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
    const { payload } = await jwtVerify(token, JWKS, {
      algorithms: ["ES256"],
      audience: "authenticated",
      issuer: `${env.SUPABASE_URL}/auth/v1`,
    });

    const decoded = payload as unknown as SupabaseJwtPayload;

    const tenantId = decoded.tenant_id;
    if (!tenantId) {
      return fail(
        reply,
        403,
        "FORBIDDEN",
        "No tenant associated with this token"
      );
    }

    request.tenantId = tenantId;
    request.userId = decoded.sub;
    request.role = decoded.app_metadata?.role || "member";
  } catch (err) {
    if (err instanceof Error && err.name === "JWTExpired") {
      return fail(reply, 401, "UNAUTHENTICATED", "Token expired");
    }
    return fail(reply, 401, "UNAUTHENTICATED", "Invalid token");
  }
}
