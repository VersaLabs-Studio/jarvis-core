import { describe, it, expect, beforeAll } from "vitest";
import Fastify from "fastify";
import { validateEnv } from "../src/lib/env.js";
import { supabasePlugin } from "../src/plugins/supabase.js";
import { protectedPlugin } from "../src/middleware/protected.js";
import { registerAllEntities } from "../src/factory/register-entities.js";
import { workflowTriggerRoutes } from "../src/routes/workflows/trigger.js";
import { integrationTestRoutes } from "../src/routes/integrations/test.js";
import { logsRoutes } from "../src/routes/logs/index.js";
import { adminRoutes } from "../src/routes/admin/index.js";

describe("Wired Server Integration Tests", () => {
  let server: ReturnType<typeof Fastify>;

  beforeAll(async () => {
    server = Fastify();
    validateEnv();
    await server.register(supabasePlugin);
    await server.register(protectedPlugin);
    await registerAllEntities(server);
    await server.register(workflowTriggerRoutes);
    await server.register(integrationTestRoutes);
    await server.register(logsRoutes);
    await server.register(adminRoutes);
  });

  it("should hit a factory CRUD route (GET /api/workflows)", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/workflows",
      headers: { authorization: "Bearer test-token" },
    });

    expect(response.statusCode).not.toBe(404);
  });

  it("should trigger a workflow run", async () => {
    const response = await server.inject({
      method: "POST",
      url: "/api/workflows/test-id/trigger",
      headers: { authorization: "Bearer test-token" },
      payload: {},
    });

    expect(response.statusCode).not.toBe(404);
  });

  it("should reject admin routes for members", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/admin/overview",
      headers: { authorization: "Bearer member-token" },
    });

    expect(response.statusCode).toBe(403);
  });
});
