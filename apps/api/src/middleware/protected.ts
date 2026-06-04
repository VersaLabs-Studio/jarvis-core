import type { FastifyRequest, FastifyReply } from "fastify";
import { authMiddleware } from "./auth.js";
import { tenantMiddleware } from "./tenant.js";

export async function protectedMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  await authMiddleware(request, reply);
  if (reply.sent) return;

  await tenantMiddleware(request, reply);
}
