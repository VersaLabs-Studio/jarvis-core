// =============================================================================
// POST /v1/skill/run — async skill execution.
//
// Returns { run_id } immediately. The actual skill runs in the background
// (sub-agent sandbox). Progress is emitted over the WS endpoint
// (`/ws`) as `{ type: "skill:progress", run_id, step, pct, status }`,
// `{ type: "skill:result", run_id, output }`, or
// `{ type: "skill:error", run_id, error }`.
//
// E0 implementation: looks up the skill doc, runs the sub-agent on the
// doc body (treated as the prompt/code for the sub-agent). E1/E2 supply
// the real skill docs. The run_id is a UUID; the WS subscriber list
// (held in the ws route) is the broadcast target.
// =============================================================================

import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { fail, ok } from "../lib/response.js";
import { getSkillByName } from "../lib/skill-loader.js";
import { spawnSubAgent } from "../sandbox/orchestrator.js";
import { broadcast } from "./ws.js";
import { log } from "../lib/logger.js";
import type { SkillRunResponse } from "@jarvis/shared";

const skillRunBodySchema = z.object({
  skill: z.string().min(1),
  args: z.record(z.unknown()).default({}),
});

export async function skillRunRoute(fastify: FastifyInstance): Promise<void> {
  fastify.post("/v1/skill/run", async (request, reply) => {
    const parsed = skillRunBodySchema.safeParse(request.body);
    if (!parsed.success) {
      return fail(reply, "VALIDATION", "Invalid skill-run body", parsed.error.flatten());
    }
    const { skill, args } = parsed.data;
    const doc = getSkillByName(skill);
    if (!doc) {
      return fail(reply, "SKILL_NOT_FOUND", `Skill not loaded: ${skill}`);
    }

    const runId = randomUUID();
    log.info({ runId, skill }, "Skill run started");

    // Respond immediately; the work happens in the background.
    const response: SkillRunResponse = { run_id: runId };
    ok(reply, response, 202);

    // Run async (do not await) — broadcast progress over WS
    void (async () => {
      try {
        broadcast({ type: "skill:progress", run_id: runId, step: "starting", pct: 0, status: "running" });
        const result = await spawnSubAgent({
          runId,
          skill,
          code: doc.body, // E0: run the doc body as the snippet
          language: "node",
          env: { HERMES_RUN_ID: runId, HERMES_SKILL: skill, ...stringifyArgs(args) },
        });
        if (result.timedOut) {
          broadcast({ type: "skill:error", run_id: runId, error: "timeout" });
          return;
        }
        if (result.exitCode !== 0) {
          broadcast({ type: "skill:error", run_id: runId, error: result.stderr || `exit ${result.exitCode}` });
          return;
        }
        broadcast({ type: "skill:result", run_id: runId, output: result.stdout });
      } catch (err) {
        log.error({ err: err instanceof Error ? err.message : String(err), runId }, "Skill run failed");
        broadcast({ type: "skill:error", run_id: runId, error: err instanceof Error ? err.message : String(err) });
      }
    })();
  });
}

function stringifyArgs(args: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(args)) {
    out[k] = typeof v === "string" ? v : JSON.stringify(v);
  }
  return out;
}
