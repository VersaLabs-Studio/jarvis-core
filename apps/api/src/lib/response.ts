import type { FastifyReply } from "fastify";
import type { ApiOk, ApiPaginated, ApiError, ErrorCode } from "@jarvis/shared";

export function ok<T>(reply: FastifyReply, data: T, status = 200): void {
  const response: ApiOk<T> = { ok: true, data };
  reply.code(status).send(response);
}

export function paginated<T>(
  reply: FastifyReply,
  data: T[],
  meta: { page: number; pageSize: number; total: number }
): void {
  const response: ApiPaginated<T> = {
    ok: true,
    data,
    page: meta.page,
    pageSize: meta.pageSize,
    total: meta.total,
    hasMore: meta.page * meta.pageSize < meta.total,
  };
  reply.code(200).send(response);
}

export function fail(
  reply: FastifyReply,
  status: number,
  code: ErrorCode,
  message: string,
  details?: unknown
): void {
  const response: ApiError = {
    ok: false,
    error: { code, message, details },
  };
  reply.code(status).send(response);
}

export function unauthorized(reply: FastifyReply, message = "Unauthorized") {
  return fail(reply, 401, "UNAUTHENTICATED", message);
}

export function forbidden(reply: FastifyReply, message = "Forbidden") {
  return fail(reply, 403, "FORBIDDEN", message);
}

export function notFound(reply: FastifyReply, message = "Not found") {
  return fail(reply, 404, "NOT_FOUND", message);
}

export function validationError(reply: FastifyReply, details: unknown) {
  return fail(reply, 422, "VALIDATION", "Validation failed", details);
}

export function internalError(reply: FastifyReply, message = "Internal server error") {
  return fail(reply, 500, "INTERNAL", message);
}
