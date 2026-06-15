// =============================================================================
// Request-id plugin (F2 — observability).
//
// The canonical implementation of "every request gets a request id, and
// downstream code can read it without it being threaded through every
// signature":
//
//   1. `genRequestId` (exported, NOT a plugin function) is the
//      `genReqId` we pass to Fastify's constructor. It reads the
//      `X-Request-Id` header (validated as a safe id string) and
//      falls back to a UUIDv4. This is the **earliest** possible
//      point at which the id is known — every per-request log line
//      Fastify emits uses it as `reqId`.
//
//   2. `requestIdPlugin` is the Fastify plugin. It installs an
//      `onRequest` hook that:
//        a) Echoes the id back as `X-Request-Id` on the response.
//        b) Enters the id into the request-scoped AsyncLocalStorage
//           so any downstream code (HermesClient.fetch, cron
//           dispatch, setErrorHandler, etc.) can call
//           `getRequestContext()` and read the current id.
//
// Why split into (1) and (2): Fastify's `genReqId` MUST be in the
// constructor options, before any plugin runs. But the ALS
// enterWith and the response-header echo are per-request — they
// need to run inside the request lifecycle, which is the plugin.
// =============================================================================

import { randomUUID } from "node:crypto";
import type { IncomingMessage } from "node:http";
import type { FastifyInstance, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { requestContextStorage, type RequestContext } from "../lib/request-context.js";

const HEADER = "x-request-id";
/** A sane upper bound to prevent a malicious caller from blowing up logs. */
const MAX_REQUEST_ID_LEN = 128;

function isSafeRequestId(value: string): boolean {
  // Accept UUIDs, hex/base32/base64-ish, dotted/hyphenated ids. Reject
  // whitespace, control chars, JSON, or newlines — anything that could
  // log-inject downstream.
  if (value.length === 0 || value.length > MAX_REQUEST_ID_LEN) return false;
  return /^[A-Za-z0-9._\-]+$/.test(value);
}

/**
 * Fastify `genReqId` implementation. Reads `X-Request-Id` from the
 * request, validates, and falls back to a fresh UUIDv4. Exported (not
 * a plugin function) so server.ts can pass it to the Fastify
 * constructor.
 *
 * Fastify v5 invokes `genReqId` with the raw `IncomingMessage` (the
 * underlying Node.js request) — before the FastifyRequest wrapper is
 * built. We only need `headers`, which is on both shapes.
 */
export function genRequestId(request: IncomingMessage): string {
  const raw = request.headers[HEADER];
  const incoming = Array.isArray(raw) ? raw[0] : raw;
  if (typeof incoming === "string" && isSafeRequestId(incoming)) {
    return incoming;
  }
  return randomUUID();
}

export const requestIdPlugin = fp(async function requestIdPlugin(fastify: FastifyInstance): Promise<void> {
  // Echo the id on the response so the client can correlate.
  fastify.addHook("onRequest", async (request, reply) => {
    void reply.header(HEADER, request.id);
  });

  // Enter the request-scoped AsyncLocalStorage so downstream async code
  // (fetch to hermes, setErrorHandler, etc.) can read getRequestContext().
  // We use `enterWith` (not `run`) so the store is set for the rest of
  // the request lifetime without needing to wrap the handler. Note:
  // `enterWith` is leaky — once set in a given async context, it
  // persists. For per-request correctness, each inbound request starts
  // in a fresh async context, so this is fine. The ALS is best-effort;
  // the X-Request-Id header (echoed above) is the authoritative
  // propagation channel.
  fastify.addHook("preHandler", async (request) => {
    const ctx: RequestContext = {
      requestId: request.id,
      service: "api",
    };
    requestContextStorage.enterWith(ctx);
  });
});
