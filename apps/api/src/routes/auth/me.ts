import type { FastifyInstance } from "fastify";
import { ok, fail } from "../../lib/response.js";
import { tenantMiddleware } from "../../middleware/tenant.js";

export async function meRoute(fastify: FastifyInstance): Promise<void> {
  // Auth hook and route must share the same Fastify instance. Encapsulating
  // the route in a scope that owns the preHandler is what makes
  // request.userId/tenantId/supabaseAdmin available inside the handler.
  await fastify.register(async (s) => {
    s.addHook("preHandler", tenantMiddleware);

    s.get("/api/auth/me", async (request, reply) => {
      // userId and tenantId are set by tenantMiddleware (JWKS verified)
      const userId = request.userId;
      const tenantId = request.tenantId;

      try {
        const { data: profile, error: profileError } =
          await request.supabaseAdmin
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single();

        if (profileError || !profile) {
          return fail(
            reply,
            404,
            "NOT_FOUND",
            "Profile not found. Please bootstrap first."
          );
        }

        return ok(reply, {
          user: {
            id: userId,
            email: profile.email,
          },
          profile,
          tenant_id: tenantId,
          role: request.role || "member",
        });
      } catch (err) {
        console.error("Me error:", err);
        return fail(reply, 500, "INTERNAL", "Internal server error");
      }
    });
  });
}
