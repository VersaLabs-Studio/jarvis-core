// =============================================================================
// WS /ws — internal-only channel for skill-run progress + notifications.
//
// Subscribers register via `{ type: "subscribe", run_ids?: string[] }`.
// Server pushes:
//   { type: "skill:progress", run_id, step, pct, status }
//   { type: "skill:result", run_id, output }
//   { type: "skill:error", run_id, error }
//   { type: "notification", title, message, level? }
//
// E0 ships the channel + a broadcast() helper used by skill-run.ts.
// The notification producer is added in E2/E4 (cron + push).
// =============================================================================

import type { FastifyInstance } from "fastify";
import type { WebSocket } from "@fastify/websocket";
import { log } from "../lib/logger.js";

interface Subscriber {
  socket: WebSocket;
  subscribedRunIds: Set<string> | null; // null = subscribe-all
}

const _subscribers: Set<Subscriber> = new Set();

/** Broadcast a JSON-serializable event to all matching subscribers. */
export function broadcast(event: Record<string, unknown>): void {
  const json = JSON.stringify(event);
  for (const sub of _subscribers) {
    if (sub.socket.readyState !== sub.socket.OPEN) continue;
    const runId = typeof event["run_id"] === "string" ? event["run_id"] : null;
    if (sub.subscribedRunIds && runId && !sub.subscribedRunIds.has(runId)) continue;
    try {
      sub.socket.send(json);
    } catch (err) {
      log.warn({ err: err instanceof Error ? err.message : String(err) }, "WS broadcast failed; dropping subscriber");
      _subscribers.delete(sub);
    }
  }
}

export async function wsRoute(fastify: FastifyInstance): Promise<void> {
  fastify.get("/ws", { websocket: true }, (socket, _request) => {
    const sub: Subscriber = { socket, subscribedRunIds: null };
    _subscribers.add(sub);
    log.info({ subs: _subscribers.size }, "WS subscriber connected");

    socket.on("message", (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString()) as { type?: string; run_ids?: string[] };
        if (msg.type === "subscribe") {
          sub.subscribedRunIds = Array.isArray(msg.run_ids) ? new Set(msg.run_ids) : null;
          socket.send(JSON.stringify({ type: "subscribed", run_ids: msg.run_ids ?? "all" }));
        } else if (msg.type === "ping") {
          socket.send(JSON.stringify({ type: "pong", ts: Date.now() }));
        } else {
          socket.send(JSON.stringify({ type: "error", data: { message: `Unknown message type: ${msg.type}` } }));
        }
      } catch {
        socket.send(JSON.stringify({ type: "error", data: { message: "Invalid message format" } }));
      }
    });

    socket.on("close", () => {
      _subscribers.delete(sub);
      log.info({ subs: _subscribers.size }, "WS subscriber disconnected");
    });

    socket.on("error", (err: Error) => {
      log.error({ err: err.message }, "WS subscriber error");
      _subscribers.delete(sub);
    });
  });
}
