import type { FastifyInstance } from "fastify";
import { verifyAccessToken, NoTenantError } from "../../lib/auth-verify.js";
import { getHermesClient } from "../../lib/hermes.js";

type WebSocket = import("@fastify/websocket").WebSocket;

interface WsContext {
  tenantId: string;
  userId: string;
  role: string;
  isAlive: boolean;
}

const HEARTBEAT_INTERVAL = 30_000;
const PONG_TIMEOUT = 10_000;

const activeStreams = new Map<string, AbortController>();

export async function wsRoute(fastify: FastifyInstance): Promise<void> {
  fastify.get("/ws", { websocket: true }, async (socket: WebSocket, request) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const token = url.searchParams.get("token");

    url.searchParams.delete("token");
    const sanitizedUrl = url.toString();
    fastify.log.info(`WS connection attempt: ${sanitizedUrl}`);

    if (!token) {
      socket.close(4401, "Missing token");
      return;
    }

    let ctx: WsContext;
    try {
      const verified = await verifyAccessToken(token);
      ctx = { ...verified, isAlive: true };
    } catch (err) {
      if (err instanceof NoTenantError) {
        fastify.log.warn("WS auth failed: no tenant");
        socket.close(4401, "No tenant");
        return;
      }
      fastify.log.warn(`WS auth failed: ${err instanceof Error ? err.message : "unknown"}`);
      socket.close(4401, "Invalid token");
      return;
    }

    fastify.log.info(`WS connected: userId=${ctx.userId}, tenant=${ctx.tenantId}`);

    const heartbeat = setInterval(() => {
      if (!ctx.isAlive) {
        fastify.log.info(`WS dead socket: userId=${ctx.userId}`);
        clearInterval(heartbeat);
        socket.terminate();
        return;
      }
      ctx.isAlive = false;
      socket.ping();
    }, HEARTBEAT_INTERVAL);

    socket.on("pong", () => {
      ctx.isAlive = true;
    });

    socket.on("close", () => {
      clearInterval(heartbeat);
      activeStreams.delete(ctx.userId);
      fastify.log.info(`WS disconnected: userId=${ctx.userId}`);
    });

    socket.on("error", (err: Error) => {
      fastify.log.error(`WS error: ${err.message}`);
      clearInterval(heartbeat);
      activeStreams.delete(ctx.userId);
    });

    socket.on("message", async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());

        switch (message.type) {
          case "chat:send":
            await handleChatSend(socket, ctx, message);
            break;
          case "chat:cancel":
            handleChatCancel(socket, ctx);
            break;
          case "ping":
            socket.send(JSON.stringify({ type: "pong" }));
            break;
          default:
            socket.send(
              JSON.stringify({
                type: "error",
                data: { message: `Unknown message type: ${message.type}` },
              })
            );
        }
      } catch {
        socket.send(
          JSON.stringify({
            type: "error",
            data: { message: "Invalid message format" },
          })
        );
      }
    });
  });
}

async function handleChatSend(
  socket: WebSocket,
  ctx: WsContext,
  message: { sessionId?: string; message?: string; model?: string; tools?: string[] }
): Promise<void> {
  if (!message.sessionId || !message.message) {
    socket.send(
      JSON.stringify({
        type: "error",
        data: { message: "sessionId and message are required" },
      })
    );
    return;
  }

  const existing = activeStreams.get(ctx.userId);
  if (existing) {
    existing.abort();
    activeStreams.delete(ctx.userId);
  }

  const controller = new AbortController();
  activeStreams.set(ctx.userId, controller);

  const hermes = getHermesClient();

  try {
    const stream = hermes.sendMessage({
      sessionId: message.sessionId,
      message: message.message,
      model: message.model,
      tools: message.tools,
    });

    for await (const chunk of stream) {
      if (controller.signal.aborted) {
        break;
      }

      socket.send(
        JSON.stringify({
          type: "chat:chunk",
          data: chunk,
        })
      );

      if (chunk.type === "done") {
        socket.send(JSON.stringify({ type: "chat:done" }));
      }
    }
  } catch (err) {
    if (!controller.signal.aborted) {
      socket.send(
        JSON.stringify({
          type: "chat:error",
          data: { message: err instanceof Error ? err.message : "Stream failed" },
        })
      );
    }
  } finally {
    if (activeStreams.get(ctx.userId) === controller) {
      activeStreams.delete(ctx.userId);
    }
  }
}

function handleChatCancel(socket: WebSocket, ctx: WsContext): void {
  const controller = activeStreams.get(ctx.userId);
  if (controller) {
    controller.abort();
    activeStreams.delete(ctx.userId);
    socket.send(JSON.stringify({ type: "chat:cancelled" }));
  }
}
