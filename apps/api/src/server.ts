import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import websocket from "@fastify/websocket";
import { validateEnv } from "./lib/env.js";
import { supabasePlugin } from "./plugins/supabase.js";
import { meRoute } from "./routes/auth/me.js";
import { bootstrapRoute } from "./routes/auth/bootstrap.js";
import { chatSendRoute } from "./routes/chat/send.js";
import { chatSessionsRoute } from "./routes/chat/sessions.js";
import { chatMessagesRoute } from "./routes/chat/messages.js";
import { wsRoute } from "./routes/ws/handler.js";

const env = validateEnv();

const fastify = Fastify({
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

await fastify.register(supabasePlugin);

await fastify.register(meRoute);
await fastify.register(bootstrapRoute);
await fastify.register(chatSendRoute);
await fastify.register(chatSessionsRoute);
await fastify.register(chatMessagesRoute);
await fastify.register(wsRoute);

fastify.get("/health", async () => ({ status: "ok", version: "1.5.0" }));

try {
  await fastify.listen({ port: env.PORT, host: env.HOST });
  fastify.log.info(`API listening on ${env.HOST}:${env.PORT}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
