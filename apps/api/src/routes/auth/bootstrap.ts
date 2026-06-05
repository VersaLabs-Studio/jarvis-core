import type { FastifyInstance } from "fastify";
import { ok, fail } from "../../lib/response.js";

export async function bootstrapRoute(fastify: FastifyInstance): Promise<void> {
  fastify.post("/api/auth/bootstrap", async (request, reply) => {
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

      const { data: existingProfile } = await fastify.supabaseAdmin
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (existingProfile) {
        return ok(reply, { profile: existingProfile, created: false });
      }

      const { data: profile, error: rpcError } =
        await fastify.supabaseAdmin.rpc("bootstrap_user", {
          p_user_id: user.id,
          p_email: user.email || "",
          p_full_name: (user.user_metadata?.full_name as string) || "",
        });

      if (rpcError) {
        console.error("bootstrap_user RPC error:", rpcError);
        return fail(reply, 500, "DB_ERROR", "Failed to bootstrap user");
      }

      return ok(reply, { profile, created: true });
    } catch (err) {
      console.error("Bootstrap error:", err);
      return fail(reply, 500, "INTERNAL", "Internal server error");
    }
  });
}
