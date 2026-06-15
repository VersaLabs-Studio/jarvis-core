// =============================================================================
// Hermes server — boot sequence (Phase E §5.6).
//
// 1. validateEnv (Zod; refuse on missing)
// 2. init logger (pino)
// 3. await resolveAllChains() (C5 fix; fail boot if all chains missing)
// 4. await initBudget() (Redis; no-op if no REDIS_URL)
// 5. await loadSkills() (read /app/data/skills/**/*.md, Zod-validate, skip malformed)
// 6. await initDockerControl() (probe socket-proxy; disabled if no DOCKER_HOST)
// 7. await fastify.listen({ port: 8765, host: "0.0.0.0" })
// 8. (E4 will load crons; E0 ships an empty registry)
// 9. Boot-check: fire-and-forget ping of resolved primary (does not block boot)
// =============================================================================

import Fastify from "fastify";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import { validateEnv } from "./config/env.js";
import { initSentry, registerSentryHooks } from "./plugins/sentry.js";
import { genRequestId, requestIdPlugin } from "./plugins/request-id.js";
import { getLogger, log } from "./lib/logger.js";
import { resolveAllChains } from "./lib/model-resolver.js";
import { initBudget, shutdownBudget } from "./lib/budget.js";
import { initDockerControl } from "./lib/docker-control.js";
import { loadSkills } from "./lib/skill-loader.js";
import { nonStreamChat, OpenRouterError } from "./lib/openrouter.js";
import { getResolved } from "./lib/model-resolver.js";
import { healthRoute } from "./routes/health.js";
import { chatStreamRoute } from "./routes/chat-stream.js";
import { skillRunRoute } from "./routes/skill-run.js";
import { skillsListRoute } from "./routes/skills-list.js";
import { mcpTestRoute } from "./routes/mcp-test.js";
import { cronListRoute } from "./routes/cron-list.js";
import { wsRoute } from "./routes/ws.js";
import { CronEngine } from "./cron/engine.js";

async function main(): Promise<void> {
  // 1. env
  const env = validateEnv();

  // 2. logger
  const logger = getLogger();
  logger.info({ env: { NODE_ENV: env.NODE_ENV, PORT: env.PORT, HOST: env.HOST } }, "Hermes booting");

  // F2 — observability. Init Sentry BEFORE constructing Fastify so the
  // init line is visible in the boot log. No-op if SENTRY_DSN/GLITCHTIP_DSN
  // are unset.
  const sentryEnabled = initSentry();
  if (sentryEnabled) {
    logger.info("Sentry error capture enabled");
  }

  // Fastify
  const fastify = Fastify({
    // F2 — request id from `X-Request-Id` header (validated) or generated.
    genReqId: genRequestId,
    logger: false, // we use pino directly; Fastify's default would double-log
    disableRequestLogging: true,
  });
  await fastify.register(cors, { origin: true, credentials: true });
  await fastify.register(websocket);

  // F2 — request-id plugin before any route so the id is in
  // AsyncLocalStorage when routes (and cron-driven loopback) read it.
  await fastify.register(requestIdPlugin);

  // F2 — register the Sentry onError hook (no-op if Sentry is disabled).
  if (sentryEnabled) {
    registerSentryHooks(fastify);
  }

  // 3. model resolver (C5 fix)
  try {
    await resolveAllChains();
    const resolved = getResolved();
    logger.info(
      {
        chains: {
          planning: resolved.planning.primary.resolved,
          coding: resolved.coding.primary.resolved,
          office: resolved.office.primary.resolved,
          fast: resolved.fast.primary.resolved,
          audit: resolved.audit.primary.resolved,
        },
      },
      "Model chains resolved",
    );
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : String(err) }, "Model resolver failed at boot");
    process.exit(1);
  }

  // 4. budget
  await initBudget();

  // 5. skill loader
  try {
    const summary = await loadSkills();
    logger.info(summary, "Skills loaded");
  } catch (err) {
    logger.warn({ err: err instanceof Error ? err.message : String(err) }, "Skill loader failed; continuing with 0 skills");
  }

  // 6. docker control
  await initDockerControl();

  // Register routes
  await healthRoute(fastify);
  await chatStreamRoute(fastify);
  await skillRunRoute(fastify);
  await skillsListRoute(fastify);
  await mcpTestRoute(fastify);
  await cronListRoute(fastify);
  await wsRoute(fastify);

  // 7. listen
  try {
    await fastify.listen({ port: env.PORT, host: env.HOST });
    logger.info({ port: env.PORT, host: env.HOST }, "Hermes listening");
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : String(err) }, "Listen failed");
    process.exit(1);
  }

  // 9. boot-check (fire-and-forget; does not block)
  void runBootCheck();

  // 10. E4 cron engine — lazy-init; chat still works if REDIS_URL is unset
  const cronEngine = new CronEngine();
  await cronEngine.init();
  if (cronEngine.isDisabled()) {
    logger.warn({ reason: cronEngine.getDisabledReason() }, "Cron engine disabled");
  }

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, "Shutting down Hermes");
    try {
      await fastify.close();
    } catch (err) {
      logger.error({ err: err instanceof Error ? err.message : String(err) }, "fastify.close() failed");
    }
    await cronEngine.shutdown().catch((err) => {
      logger.error({ err: err instanceof Error ? err.message : String(err) }, "cron engine shutdown failed");
    });
    await shutdownBudget();
    process.exit(0);
  };
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

async function runBootCheck(): Promise<void> {
  try {
    const resolved = getResolved();
    const primary = resolved.coding.primary.resolved;
    const result = await nonStreamChat({ model: primary, messages: [{ role: "user", content: "ping" }] });
    log.info({ model: result.model, latency_ms: result.usage.duration_ms }, "Boot-check OK");
  } catch (err) {
    if (err instanceof OpenRouterError) {
      log.warn({ code: err.code, message: err.message }, "Boot-check DEGRADED");
    } else {
      log.warn({ err: err instanceof Error ? err.message : String(err) }, "Boot-check DEGRADED (unexpected error)");
    }
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("FATAL: Hermes boot failed:", err);
  process.exit(1);
});
