import type { FastifyInstance } from "fastify";
import { ok, fail } from "../../lib/response.js";
import { protectedPlugin } from "../../middleware/protected.js";

export async function servicesRoutes(fastify: FastifyInstance): Promise<void> {
  await fastify.register(protectedPlugin);

  fastify.get("/api/services", async (request, reply) => {
    const { data, error } = await request.supabase
      .from("services")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return fail(reply, 500, "DB_ERROR", "Failed to fetch services");
    }
    return ok(reply, data);
  });

  fastify.get("/api/services/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const { data, error } = await request.supabase
      .from("services")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      return fail(reply, 404, "NOT_FOUND", "Service not found");
    }
    return ok(reply, data);
  });

  fastify.post("/api/services/:id/restart", async (request, reply) => {
    const { id } = request.params as { id: string };

    const { data: service, error: lookupError } = await request.supabase
      .from("services")
      .select("id, name, type, config")
      .eq("id", id)
      .single();

    if (lookupError || !service) {
      return fail(reply, 404, "NOT_FOUND", "Service not found");
    }

    const containerName = `jarvis-${service.id}`;

    try {
      const dockerHost = process.env.DOCKER_HOST || "tcp://docker-socket-proxy:2375";
      const response = await fetch(`${dockerHost}/containers/${containerName}/restart`, {
        method: "POST",
        signal: AbortSignal.timeout(30_000),
      });

      if (!response.ok) {
        return fail(reply, 502, "UPSTREAM_ERROR", "Container restart failed");
      }

      return ok(reply, { restarted: true, service: service.name });
    } catch (err) {
      console.error("Container restart error:", err);
      return fail(reply, 502, "UPSTREAM_ERROR", "Docker proxy unreachable");
    }
  });
}
