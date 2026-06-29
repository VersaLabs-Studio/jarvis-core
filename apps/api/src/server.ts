import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import websocket from "@fastify/websocket";
import { validateEnv } from "./lib/env.js";
import { initSentry, registerSentryHooks } from "./plugins/sentry.js";
import { genRequestId, requestIdPlugin } from "./plugins/request-id.js";
import { supabasePlugin } from "./plugins/supabase.js";
import { meRoute } from "./routes/auth/me.js";
import { bootstrapRoute } from "./routes/auth/bootstrap.js";
import { chatSendRoute } from "./routes/chat/send.js";
import { chatSessionsRoute } from "./routes/chat/sessions.js";
import { chatMessagesRoute } from "./routes/chat/messages.js";
import { wsRoute } from "./routes/ws/handler.js";
import { servicesRoutes } from "./routes/services/index.js";
import { secretsRoutes } from "./routes/secrets/index.js";
import { registerAllEntities } from "./factory/register-entities.js";
import { modelsRoutes } from "./routes/models/index.js";
import { workflowTriggerRoutes } from "./routes/workflows/trigger.js";
import { integrationTestRoutes } from "./routes/integrations/test.js";
import { logsRoutes } from "./routes/logs/index.js";
import { analyticsRoutes } from "./routes/analytics/index.js";
import { adminRoutes } from "./routes/admin/index.js";
import { readyRoute } from "./routes/health/ready.js";

const env = validateEnv();

// F2 — observability. Init Sentry BEFORE constructing Fastify so the
// init line is visible in the boot log. No-op if SENTRY_DSN/GLITCHTIP_DSN
// are unset.
const sentryEnabled = initSentry();

const fastify = Fastify({
  // F2 — request id from `X-Request-Id` header (validated) or generated.
  // This becomes `reqId` on every per-request pino log line.
  genReqId: genRequestId,
  logger: {
    level: env.NODE_ENV === "production" ? "info" : "debug",
    transport:
      env.NODE_ENV !== "production"
        ? { target: "pino-pretty", options: { translateTime: "HH:MM:ss Z", ignore: "pid,hostname" } }
        : undefined,
  },
});

await fastify.register(cors, {
  origin: env.CORS_ORIGINS ? env.CORS_ORIGINS.split(",") : true,
  credentials: true,
});

await fastify.register(helmet);

await fastify.register(websocket);

// F2 — request-id plugin BEFORE supabasePlugin so the request id is in
// AsyncLocalStorage before any auth hook reads the request.
await fastify.register(requestIdPlugin);

await fastify.register(supabasePlugin);

await registerAllEntities(fastify);

// F2 — register the Sentry onError hook (no-op if Sentry is disabled).
// MUST be after `register` so `fastify.addHook` applies to all routes.
if (sentryEnabled) {
  registerSentryHooks(fastify);
}

await fastify.register(meRoute);
await fastify.register(bootstrapRoute);
await fastify.register(chatSendRoute);
await fastify.register(chatSessionsRoute);
await fastify.register(chatMessagesRoute);
await fastify.register(wsRoute);
await fastify.register(servicesRoutes);
await fastify.register(secretsRoutes);

await fastify.register(modelsRoutes);
await fastify.register(workflowTriggerRoutes);
await fastify.register(integrationTestRoutes);
await fastify.register(logsRoutes);
await fastify.register(analyticsRoutes);
await fastify.register(adminRoutes);

// Liveness — fast, no auth, no checks. Answers "the process is up."
fastify.get("/health", async () => ({ status: "ok", version: "1.5.0" }));

// Readiness (F2) — answers "the process can serve traffic." Pings redis
// (if REDIS_URL) and the hosted Supabase JWKS endpoint. 503 if any
// check is down.
await fastify.register(readyRoute);

try {
  await fastify.listen({ port: env.PORT, host: env.HOST });
  fastify.log.info(`API listening on ${env.HOST}:${env.PORT}`);
  if (sentryEnabled) {
    fastify.log.info("Sentry error capture enabled");
  }
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
