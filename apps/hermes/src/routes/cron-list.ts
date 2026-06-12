// =============================================================================
// GET /v1/cron — list cron jobs (E0 stub: empty list; E4 populates).
// =============================================================================

import type { FastifyInstance } from "fastify";
import { ok } from "../lib/response.js";
import type { CronListResponse } from "@jarvis/shared";

export async function cronListRoute(fastify: FastifyInstance): Promise<void> {
  fastify.get("/v1/cron", async (_request, reply) => {
    const response: CronListResponse = { jobs: [] };
    return ok(reply, response);
  });
}
