// =============================================================================
// Hermes response envelope. Mirrors `packages/shared/src/types/api.ts` so
// the API client can parse errors uniformly.
// =============================================================================

import type { FastifyReply } from "fastify";
import type { HermesErrorCode } from "@jarvis/shared";
import { HERMES_ERROR_STATUS } from "../config/constants.js";

export interface ApiOk<T> {
  ok: true;
  data: T;
}

export interface ApiError {
  ok: false;
  error: { code: HermesErrorCode; message: string; details?: unknown };
}

export function ok<T>(reply: FastifyReply, data: T, status = 200): FastifyReply {
  return reply.code(status).send({ ok: true, data } as ApiOk<T>);
}

export function fail(
  reply: FastifyReply,
  code: HermesErrorCode,
  message: string,
  details?: unknown,
): FastifyReply {
  const status = HERMES_ERROR_STATUS[code];
  return reply.code(status).send({ ok: false, error: { code, message, details } } as ApiError);
}
