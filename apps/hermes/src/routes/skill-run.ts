// =============================================================================
// POST /v1/skill/run — async agentic skill execution (Phase E §3 option A).
//
// Returns { run_id } 202 immediately. The actual skill runs in the background
// via `runSkillAgentically` (apps/hermes/src/lib/skill-runner.ts). Progress
// is emitted over the WS endpoint (`/ws`) as:
//   { type: "skill:progress", run_id, step, pct, status }
//   { type: "skill:result", run_id, output }
//   { type: "skill:error", run_id, error }
//
// The §3 prelude implementation: skill bodies are markdown instructions the
// LLM follows; the route runs an agentic loop (max MAX_AGENT_ITERATIONS)
// where the LLM can emit tool_calls (`code_exec` → sandbox; MCP server →
// bridge — E3 wires). The skill body is never `eval`'d.
// =============================================================================

import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { fail, ok } from "../lib/response.js";
import { getSkillByName } from "../lib/skill-loader.js";
import { runSkillAgentically } from "../lib/skill-runner.js";
import { log } from "../lib/logger.js";
import type { SkillRunResponse } from "@jarvis/shared";

const skillRunBodySchema = z.object({
  skill: z.string().min(1),
  args: z.record(z.unknown()).default({}),
  /** Optional role override; if absent, uses skill.preferred_model_role ?? "coding". */
  role: z.enum(["planning", "coding", "office", "fast", "audit"]).optional(),
  /** Optional initial user message; defaults to "Run the <skill> skill." */
  initial_message: z.string().min(1).optional(),
});

export async function skillRunRoute(fastify: FastifyInstance): Promise<void> {
  fastify.post("/v1/skill/run", async (request, reply) => {
    const parsed = skillRunBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return fail(reply, "VALIDATION", "Invalid skill-run body", parsed.error.flatten());
    }
    const { skill, args, role, initial_message } = parsed.data;
    const doc = getSkillByName(skill);
    if (!doc) {
      return fail(reply, "SKILL_NOT_FOUND", `Skill not loaded: ${skill}`);
    }
    const runId = randomUUID();
    log.info({ runId, skill, requestedRole: role, skillPreferredRole: doc.frontmatter.preferred_model_role }, "Skill run started");
    const response: SkillRunResponse = { run_id: runId };
    ok(reply, response, 202);

    // Fire-and-forget. The runner broadcasts progress over WS.
    void runSkillAgentically({
      runId,
      skill,
      doc,
      args,
      role: role ?? doc.frontmatter.preferred_model_role ?? "coding",
      initialMessage: initial_message ?? `Run the "${doc.frontmatter.name}" skill.`,
    }).catch((err) => {
      log.error({ err: err instanceof Error ? err.message : String(err), runId }, "Skill agentic run failed");
    });
  });
}
