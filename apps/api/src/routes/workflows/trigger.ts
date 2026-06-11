import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ok, fail } from "../../lib/response.js";
import { env } from "../../lib/env.js";
import { tenantMiddleware } from "../../middleware/tenant.js";

const triggerSchema = z.object({
  input: z.record(z.unknown()).optional(),
  model: z.string().optional(),
});

export async function workflowTriggerRoutes(fastify: FastifyInstance): Promise<void> {
  await fastify.register(async (s) => {
    s.addHook("preHandler", tenantMiddleware);
    s.post("/api/workflows/:id/trigger", async (request, reply) => {
      const { id } = request.params as { id: string };
      const tenantId = request.tenantId;

      const parsed = triggerSchema.safeParse(request.body);
      if (!parsed.success) {
        return fail(reply, 422, "VALIDATION", "Invalid request body", parsed.error.flatten());
      }

      const { data: workflow, error: wfError } = await request.supabase
        .from("workflows")
        .select("id, name, definition")
        .eq("id", id)
        .single();

      if (wfError || !workflow) {
        return fail(reply, 404, "NOT_FOUND", "Workflow not found");
      }

      const { data: run, error: runError } = await request.supabase
        .from("workflow_runs")
        .insert({
          workflow_id: id,
          tenant_id: tenantId,
          status: "running",
        })
        .select("id")
        .single();

      if (runError) {
        return fail(reply, 500, "DB_ERROR", "Failed to create workflow run");
      }

      const hermesUrl = env.HERMES_URL || "http://hermes:8765";
      fetch(`${hermesUrl}/v1/workflows/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          run_id: run!.id,
          workflow: workflow.definition,
          input: parsed.data.input || {},
          model: parsed.data.model,
        }),
        signal: AbortSignal.timeout(300_000),
      }).catch((err) => {
        console.error("Hermes dispatch error:", err);
      });

      return ok(reply, { run_id: run!.id, status: "running" }, 202);
    });

    s.get("/api/workflows/:id/runs", async (request, reply) => {
      const { id } = request.params as { id: string };
      const page = Math.max(1, Number((request.query as Record<string, unknown>).page) || 1);
      const pageSize = Math.min(100, Math.max(1, Number((request.query as Record<string, unknown>).pageSize) || 20));
      const offset = (page - 1) * pageSize;

      const { count } = await request.supabase
        .from("workflow_runs")
        .select("*", { count: "exact", head: true })
        .eq("workflow_id", id);

      const { data, error } = await request.supabase
        .from("workflow_runs")
        .select("*")
        .eq("workflow_id", id)
        .range(offset, offset + pageSize - 1)
        .order("started_at", { ascending: false });

      if (error) {
        return fail(reply, 500, "DB_ERROR", "Failed to fetch runs");
      }

      return ok(reply, {
        data: data || [],
        page,
        pageSize,
        total: count || 0,
        hasMore: page * pageSize < (count || 0),
      });
    });
  });
}
