// =============================================================================
// GET /v1/cron — list cron jobs (Phase E §5.2 — populated by E4).
//
// Returns the in-memory registry declared at apps/hermes/src/cron/registry.ts.
// The registry is validated against the @jarvis/shared `cronJobSchema` at
// load time; the route serializes it to the `CronJobMeta[]` shape.
// =============================================================================

import type { FastifyInstance } from "fastify";
import { ok } from "../lib/response.js";
import type { CronListResponse, CronJobMeta } from "@jarvis/shared";
import { CRON_REGISTRY, CRON_JOB_IDS } from "../cron/registry.js";

export async function cronListRoute(fastify: FastifyInstance): Promise<void> {
  fastify.get("/v1/cron", async (_request, reply) => {
    const jobs: CronJobMeta[] = CRON_JOB_IDS.map((id) => {
      const j = CRON_REGISTRY[id]!;
      return {
        id: j.id,
        name: j.name,
        schedule: j.schedule,
        skill: j.skill,
        args: j.args,
        notify: j.notify,
        enabled: j.enabled,
      };
    });
    const response: CronListResponse = { jobs };
    return ok(reply, response);
  });
}
