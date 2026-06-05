import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ok, fail } from "../../lib/response.js";
import { seal } from "../../lib/crypto.js";
import { protectedPlugin } from "../../middleware/protected.js";

const createSecretSchema = z.object({
  name: z.string().min(1).max(255),
  value: z.string().min(1),
  type: z.enum(["api_key", "oauth_token", "database_url", "webhook_secret", "custom"]).default("custom"),
  description: z.string().max(2000).optional().nullable(),
  expires_at: z.string().datetime().optional().nullable(),
});

export async function secretsRoutes(fastify: FastifyInstance): Promise<void> {
  await fastify.register(protectedPlugin);

  fastify.get("/api/secrets", async (request, reply) => {
    const { data, error } = await request.supabase
      .from("secrets")
      .select("id, name, type, description, expires_at, created_by, created_at, updated_at")
      .order("created_at", { ascending: false });

    if (error) {
      return fail(reply, 500, "DB_ERROR", "Failed to fetch secrets");
    }
    return ok(reply, data);
  });

  fastify.post("/api/secrets", async (request, reply) => {
    const parsed = createSecretSchema.safeParse(request.body);
    if (!parsed.success) {
      return fail(reply, 422, "VALIDATION", "Invalid request body", parsed.error.flatten());
    }

    const { name, value, type, description, expires_at } = parsed.data;

    const sealedValue = seal(value);

    const { data, error } = await request.supabase
      .from("secrets")
      .insert({
        name,
        value: sealedValue,
        type,
        description,
        expires_at,
        tenant_id: request.tenantId,
        created_by: request.userId,
      })
      .select("id, name, type, description, expires_at, created_by, created_at")
      .single();

    if (error) {
      return fail(reply, 500, "DB_ERROR", "Failed to create secret");
    }

    return ok(reply, data, 201);
  });

  fastify.delete("/api/secrets/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    const { error } = await request.supabase
      .from("secrets")
      .delete()
      .eq("id", id)
      .eq("tenant_id", request.tenantId); // W4-SEC-5: tenant-scoped

    if (error) {
      return fail(reply, 404, "NOT_FOUND", "Secret not found");
    }

    return reply.code(204).send();
  });
}
