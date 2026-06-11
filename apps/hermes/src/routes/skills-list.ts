// =============================================================================
// GET /v1/skills — list loaded skill metadata (Phase E §5.2).
// =============================================================================

import type { FastifyInstance } from "fastify";
import { ok } from "../lib/response.js";
import { getLoadedSkills, toMeta } from "../lib/skill-loader.js";
import type { SkillsListResponse } from "@jarvis/shared";

export async function skillsListRoute(fastify: FastifyInstance): Promise<void> {
  fastify.get("/v1/skills", async (_request, reply) => {
    const skills = getLoadedSkills().map(toMeta);
    const response: SkillsListResponse = { skills };
    return ok(reply, response);
  });
}
