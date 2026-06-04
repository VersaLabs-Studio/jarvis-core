import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ok, fail } from "../../lib/response.js";
import { protectedPlugin } from "../../middleware/protected.js";

const ingestSchema = z.object({
  event_type: z.string().min(1).max(255),
  metadata: z.record(z.unknown()).optional(),
});

export async function analyticsRoutes(fastify: FastifyInstance): Promise<void> {
  await fastify.register(protectedPlugin);
  fastify.post("/api/analytics/events", async (request, reply) => {
    const parsed = ingestSchema.safeParse(request.body);
    if (!parsed.success) {
      return fail(reply, 422, "VALIDATION", "Invalid request body", parsed.error.flatten());
    }

    const { data, error } = await request.supabase
      .from("analytics_events")
      .insert({
        event_type: parsed.data.event_type,
        metadata: parsed.data.metadata || {},
        tenant_id: request.tenantId,
      })
      .select("id")
      .single();

    if (error) {
      return fail(reply, 500, "DB_ERROR", "Failed to ingest event");
    }

    return ok(reply, { id: data!.id }, 201);
  });

  fastify.get("/api/analytics", async (request, reply) => {
    const { data, error } = await request.supabase
      .from("analytics_events")
      .select("event_type, created_at")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) {
      return fail(reply, 500, "DB_ERROR", "Failed to fetch analytics");
    }

    const aggregated = (data || []).reduce((acc, event) => {
      const key = event.event_type;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return ok(reply, { events: data?.slice(0, 100), summary: aggregated });
  });
}
