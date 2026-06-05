import { createRemoteJWKSet, jwtVerify } from "jose";
import { env } from "./env.js";
import type { SupabaseJwtPayload } from "../types/auth.js";

export const JWKS = createRemoteJWKSet(new URL(env.SUPABASE_JWKS_URL));

export interface VerifiedToken {
  tenantId: string;
  userId: string;
  role: string;
}

export async function verifyAccessToken(token: string): Promise<VerifiedToken> {
  const { payload } = await jwtVerify(token, JWKS, {
    algorithms: ["ES256"],
    audience: "authenticated",
    issuer: `${env.SUPABASE_URL}/auth/v1`,
  });

  const decoded = payload as unknown as SupabaseJwtPayload;

  const tenantId = decoded.tenant_id;
  if (!tenantId) {
    throw new Error("No tenant associated with this token");
  }

  return {
    tenantId,
    userId: decoded.sub,
    role: decoded.app_metadata?.role || "member",
  };
}
