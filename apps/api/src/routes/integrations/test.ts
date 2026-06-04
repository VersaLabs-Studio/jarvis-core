import type { FastifyInstance } from "fastify";
import { ok, fail } from "../../lib/response.js";
import { open } from "../../lib/crypto.js";

export async function integrationTestRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post("/api/integrations/:id/test", async (request, reply) => {
    const { id } = request.params as { id: string };

    const { data: integration, error: intError } = await request.supabase
      .from("integrations")
      .select("id, name, type, config")
      .eq("id", id)
      .single();

    if (intError || !integration) {
      return fail(reply, 404, "NOT_FOUND", "Integration not found");
    }

    const { data: secret } = await request.supabase
      .from("secrets")
      .select("value")
      .eq("integration_id", id)
      .single();

    if (!secret?.value) {
      return fail(reply, 400, "VALIDATION", "Integration has no credentials");
    }

    let credential: string;
    try {
      credential = open(secret.value);
    } catch (err) {
      console.error("Secret decrypt error:", err);
      return fail(reply, 500, "INTERNAL", "Failed to decrypt credential");
    }

    try {
      let testResult: { ok: boolean; status: number; message?: string };

      switch (integration.type) {
        case "openai":
        case "anthropic": {
          const baseUrl = integration.type === "openai"
            ? "https://api.openai.com/v1"
            : "https://api.anthropic.com/v1";

          const testResp = await fetch(`${baseUrl}/models`, {
            headers: {
              Authorization: `Bearer ${credential}`,
              ...(integration.type === "anthropic" ? { "x-api-key": credential } : {}),
            },
            signal: AbortSignal.timeout(10_000),
          });

          testResult = {
            ok: testResp.ok,
            status: testResp.status,
            message: testResp.ok ? "Connection successful" : "Authentication failed",
          };
          break;
        }

        default:
          testResult = { ok: true, status: 200, message: "No test available for this type" };
      }

      return ok(reply, testResult);
    } catch (err) {
      console.error("Integration test error:", err);
      return fail(reply, 502, "UPSTREAM_ERROR", "Integration test failed");
    }
  });
}
