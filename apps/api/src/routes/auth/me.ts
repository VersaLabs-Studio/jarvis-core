import type { FastifyInstance } from "fastify";
import { ok, fail } from "../../lib/response.js";

export async function meRoute(fastify: FastifyInstance): Promise<void> {
  fastify.get("/api/auth/me", async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return fail(reply, 401, "UNAUTHENTICATED", "Missing authorization header");
    }

    const token = authHeader.slice(7);

    try {
      const {
        data: { user },
        error: authError,
      } = await fastify.supabaseAdmin.auth.getUser(token);

      if (authError || !user) {
        return fail(reply, 401, "UNAUTHENTICATED", "Invalid token");
      }

      const { data: profile, error: profileError } =
        await fastify.supabaseAdmin
          .from("profiles")
          .select("*")
          .eq("id", user.id)
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
          id: user.id,
          email: user.email,
          created_at: user.created_at,
        },
        profile,
        tenant_id: profile.tenant_id,
        role: profile.role || "member",
      });
    } catch (err) {
      console.error("Me error:", err);
      return fail(reply, 500, "INTERNAL", "Internal server error");
    }
  });
}
