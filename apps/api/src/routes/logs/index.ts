import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ok, paginated, fail } from "../../lib/response.js";

const logQuerySchema = z.object({
  level: z.enum(["info", "warn", "error", "debug"]).optional(),
  service: z.string().optional(),
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

export async function logsRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.get("/api/logs", async (request, reply) => {
    const parsed = logQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return fail(reply, 422, "VALIDATION", "Invalid query", parsed.error.flatten());
    }

    const { level, service, from, to, page, pageSize } = parsed.data;
    const offset = (page - 1) * pageSize;

    let query = request.supabase
      .from("system_logs")
      .select("*", { count: "exact" });

    if (level) query = query.eq("level", level);
    if (service) query = query.eq("service", service);
    if (from) query = query.gte("created_at", from);
    if (to) query = query.lte("created_at", to);

    const { data, error, count } = await query
      .range(offset, offset + pageSize - 1)
      .order("created_at", { ascending: false });

    if (error) {
      return fail(reply, 500, "DB_ERROR", "Failed to fetch logs");
    }

    return paginated(reply, data || [], { page, pageSize, total: count || 0 });
  });

  fastify.get("/api/logs/stream", async (request, reply) => {
    reply.raw.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    });

    const heartbeat = setInterval(() => {
      try {
        reply.raw.write(": heartbeat\n\n");
      } catch {
        clearInterval(heartbeat);
      }
    }, 30_000);

    let lastCheck = new Date().toISOString();
    const poll = setInterval(async () => {
      try {
        const { data } = await request.supabase
          .from("system_logs")
          .select("*")
          .gte("created_at", lastCheck)
          .order("created_at", { ascending: true })
          .limit(50);

        if (data && data.length > 0) {
          for (const log of data) {
            reply.raw.write(`data: ${JSON.stringify(log)}\n\n`);
          }
          lastCheck = data[data.length - 1].created_at;
        }
      } catch {
        clearInterval(poll);
        clearInterval(heartbeat);
      }
    }, 5_000);

    request.raw.on("close", () => {
      clearInterval(poll);
      clearInterval(heartbeat);
    });
  });
}
