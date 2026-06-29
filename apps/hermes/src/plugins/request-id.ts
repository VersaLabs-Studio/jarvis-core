// =============================================================================
// Request-id plugin (F2 — observability).
//
// Mirrors `apps/api/src/plugins/request-id.ts` (the request-id contract
// is the same on both ends so a single X-Request-Id header can be
// correlated across the api→hermes boundary).
//
//   1. `genRequestId` is the Fastify `genReqId` we pass to the
//      constructor. It reads the `X-Request-Id` header (validated as
//      a safe id string) and falls back to a UUIDv4. This is the
//      EARLIEST possible point at which the id is known.
//
//   2. `requestIdPlugin` is the Fastify plugin. It installs an
//      `onRequest` hook that:
//        a) Echoes the id back as `X-Request-Id` on the response.
//        b) Enters the id into the request-scoped AsyncLocalStorage
//           so the cron skill-runner (which calls back into hermes on
//           localhost) can read it via `getRequestContext()` and pass
//           it as a header.
//
// Hermes has `disableRequestLogging: true` so Fastify does not emit a
// per-request log line — the operator's pino-pretty / JSON stream
// is the canonical request log.
// =============================================================================

import { randomUUID } from "node:crypto";
import type { IncomingMessage } from "node:http";
import type { FastifyInstance, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { requestContextStorage, type RequestContext } from "../lib/request-context.js";

const HEADER = "x-request-id";
const MAX_REQUEST_ID_LEN = 128;

function isSafeRequestId(value: string): boolean {
  if (value.length === 0 || value.length > MAX_REQUEST_ID_LEN) return false;
  return /^[A-Za-z0-9._\-]+$/.test(value);
}

export function genRequestId(request: IncomingMessage): string {
  const raw = request.headers[HEADER];
  const incoming = Array.isArray(raw) ? raw[0] : raw;
  if (typeof incoming === "string" && isSafeRequestId(incoming)) {
    return incoming;
  }
  return randomUUID();
}

export const requestIdPlugin = fp(async function requestIdPlugin(fastify: FastifyInstance): Promise<void> {
  fastify.addHook("onRequest", async (request, reply) => {
    void reply.header(HEADER, request.id);
  });

  fastify.addHook("preHandler", async (request) => {
    const ctx: RequestContext = {
      requestId: request.id,
      service: "hermes",
    };
    requestContextStorage.enterWith(ctx);
  });
});
