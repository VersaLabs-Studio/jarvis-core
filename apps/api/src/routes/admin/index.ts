import type { FastifyInstance } from "fastify";
import { ok, fail, forbidden } from "../../lib/response.js";
import { protectedPlugin } from "../../middleware/protected.js";

function requireAdmin(request: { role?: string }): boolean {
  const role = request.role;
  return role === "owner" || role === "admin";
}

export async function adminRoutes(fastify: FastifyInstance): Promise<void> {
  // Register protected plugin — requires auth + tenant context
  await fastify.register(protectedPlugin);
  fastify.get("/api/admin/overview", async (request, reply) => {
    if (!requireAdmin(request)) {
      return forbidden(reply, "Admin access required");
    }

    const [users, workflows, integrations] = await Promise.all([
      request.supabase.from("profiles").select("id", { count: "exact", head: true }),
      request.supabase.from("workflows").select("id", { count: "exact", head: true }),
      request.supabase.from("integrations").select("id", { count: "exact", head: true }),
    ]);

    return ok(reply, {
      users: users.count || 0,
      workflows: workflows.count || 0,
      integrations: integrations.count || 0,
    });
  });

  fastify.get("/api/admin/users", async (request, reply) => {
    if (!requireAdmin(request)) {
      return forbidden(reply, "Admin access required");
    }

    const { data, error } = await request.supabase
      .from("profiles")
      .select("id, email, full_name, role, created_at")
      .order("created_at", { ascending: false });

    if (error) {
      return fail(reply, 500, "DB_ERROR", "Failed to fetch users");
    }

    return ok(reply, data);
  });

  fastify.get("/api/admin/health", async (request, reply) => {
    if (!requireAdmin(request)) {
      return forbidden(reply, "Admin access required");
    }

    return ok(reply, {
      status: "ok",
      version: "1.5.0",
      uptime: process.uptime(),
    });
  });
}
