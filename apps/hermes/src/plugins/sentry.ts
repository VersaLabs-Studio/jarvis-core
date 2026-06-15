// =============================================================================
// Sentry (or GlitchTip) error-capture plugin (F2 — observability).
//
// Self-contained; no-op if neither SENTRY_DSN nor GLITCHTIP_DSN is set.
// The .env.example at the repo root already documents the two env vars;
// production wires one of them (GlitchTip is Sentry-API-compatible —
// same DSN format, same SDK).
//
// Sentry is wired into Fastify via the `onError` hook so route errors
// are captured without overriding Fastify's default error response.
// Process-level uncaught exceptions and unhandled rejections are also
// captured.
//
// Hermes has `disableRequestLogging: true` so per-request log lines are
// NOT emitted by Fastify by default. Sentry + the request-id header
// are still the right primitives — operators wire their own log
// forwarding to capture the pino stream.
// =============================================================================

import * as Sentry from "@sentry/node";
import type { FastifyInstance } from "fastify";
import { getEnv } from "../config/env.js";
import { getRequestContext } from "../lib/request-context.js";

let _initialized = false;

/**
 * Initialize Sentry. Returns true if Sentry is live, false if no DSN
 * is configured (no-op mode). Idempotent — safe to call from server
 * boot.
 *
 * Resolution order: SENTRY_DSN → GLITCHTIP_DSN → none.
 * GlitchTip is API-compatible with Sentry, so the @sentry/node SDK
 * works against either DSN.
 */
export function initSentry(): boolean {
  if (_initialized) return true;
  const dsn = getEnv().SENTRY_DSN ?? getEnv().GLITCHTIP_DSN ?? null;
  if (!dsn) {
    return false;
  }
  const env = getEnv();
  Sentry.init({
    dsn,
    environment: env.SENTRY_ENVIRONMENT ?? env.NODE_ENV,
    release: env.SENTRY_RELEASE ?? "1.5.0",
    // v1.5 = error capture only. Performance traces (tracesSampleRate
    // > 0) are deferred — adding them later is non-breaking.
    tracesSampleRate: 0.0,
  });
  _initialized = true;

  // Process-level safety net.
  process.on("uncaughtException", (err) => {
    Sentry.captureException(err, { tags: { kind: "uncaughtException" } });
  });
  process.on("unhandledRejection", (reason) => {
    const err = reason instanceof Error ? reason : new Error(String(reason));
    Sentry.captureException(err, { tags: { kind: "unhandledRejection" } });
  });
  return true;
}

/** True if Sentry.init() has been called with a real DSN. */
export function isSentryEnabled(): boolean {
  return _initialized;
}

/**
 * Test-only escape hatch. Resets the module-level `_initialized` flag
 * so a fresh `initSentry()` call can be made in the next test. Does
 * NOT call Sentry.close() — callers should also clear any process
 * listeners they installed. Not for production use.
 */
export function _resetSentryForTest(): void {
  _initialized = false;
}

/**
 * Capture an exception. No-op if Sentry isn't initialized. Tags the
 * event with the current request id (if any).
 */
export function captureException(
  err: unknown,
  context?: Record<string, string | number | boolean | null>,
): void {
  if (!_initialized) return;
  const requestId = getRequestContext()?.requestId;
  Sentry.captureException(err, {
    tags: requestId ? { request_id: requestId } : {},
    extra: context ?? {},
  });
}

/**
 * Register a Fastify `onError` hook that captures every route error
 * to Sentry. Does NOT override Fastify's default error response (so
 * the wire shape — `{ok:false, error:{code, message}}` — is unchanged).
 */
export function registerSentryHooks(fastify: FastifyInstance): void {
  if (!_initialized) return;
  fastify.addHook("onError", async (request, _reply, err) => {
    captureException(err, {
      url: request.url,
      method: request.method,
      request_id: request.id,
    });
  });
}
