import type { FastifyInstance } from "fastify";
import { entities } from "@jarvis/shared";
import { registerCrud } from "./crud.js";

export async function registerEntities(fastify: FastifyInstance): Promise<void> {
  for (const [entityName, config] of Object.entries(entities)) {
    await registerCrud(fastify, entityName, config);
  }
}
