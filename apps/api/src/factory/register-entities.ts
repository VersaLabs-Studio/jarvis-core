import type { FastifyInstance } from "fastify";
import { entities } from "@jarvis/shared";
import { registerCrud } from "./crud.js";
import { tenantMiddleware } from "../middleware/tenant.js";

export async function registerAllEntities(fastify: FastifyInstance): Promise<void> {
  // Register all generated CRUD routes INSIDE an encapsulated scope that owns
  // the auth/tenant preHandler. The hook and the routes must live on the same
  // instance — a hook added in a separate encapsulated plugin (the prior
  // protectedPlugin pattern) does not apply to routes on the parent, which left
  // /api/cms/* unauthenticated with request.tenantId undefined.
  await fastify.register(async (protectedScope) => {
    protectedScope.addHook("preHandler", tenantMiddleware);
    for (const [entityName, config] of Object.entries(entities)) {
      await registerCrud(protectedScope, entityName, config);
    }
  });
}
