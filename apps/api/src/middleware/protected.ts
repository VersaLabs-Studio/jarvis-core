import type { FastifyInstance } from "fastify";
import { tenantMiddleware } from "./tenant.js";

export async function protectedPlugin(fastify: FastifyInstance): Promise<void> {
  // All routes under this plugin require auth + tenant context
  fastify.addHook("preHandler", tenantMiddleware);
}
