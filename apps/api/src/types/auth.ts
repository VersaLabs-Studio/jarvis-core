import type { FastifyRequest } from "fastify";

export interface SupabaseJwtPayload {
  sub: string;
  aud: string;
  role: string;
  exp: number;
  iat: number;
  email?: string;
  tenant_id?: string;
  app_metadata: {
    provider: string;
    providers: string[];
    role?: string;
  };
  user_metadata: Record<string, unknown>;
}

export interface AuthenticatedRequest extends FastifyRequest {
  userId: string;
  tenantId: string;
  role: string;
}
