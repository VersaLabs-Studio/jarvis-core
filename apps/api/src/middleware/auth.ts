import type { FastifyRequest, FastifyReply } from "fastify";
import { tenantMiddleware } from "./tenant.js";

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  return tenantMiddleware(request, reply);
}
