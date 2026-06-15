// =============================================================================
// Request-scoped context (F2 — observability).
//
// A single AsyncLocalStorage<RequestContext> instance used to propagate
// per-request state — currently the request id — through the async call
// chain. Hermes's `invokeSkillViaApi` reads the current id to add an
// `X-Request-Id` header on the self-loopback POST so the cron-skill-run
// lifecycle can be correlated end-to-end in logs / Sentry.
//
// P6: the context is typed; reads return `RequestContext | undefined`
// and consumers must handle the no-context case (e.g. a cron tick
// outside any inbound request).
//
// The hook in `apps/hermes/src/plugins/request-id.ts` is the only
// writer. Every other consumer should call `getRequestContext()` and
// treat the return value as advisory.
// =============================================================================

import { AsyncLocalStorage } from "node:async_hooks";

export interface RequestContext {
  /** UUIDv4 (or client-supplied) identifier for the inbound request. */
  requestId: string;
  /** Which service originated this request context. Useful in shared logs. */
  service: "api" | "hermes";
}

export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

/** Read the current request context, if any. Returns undefined outside a request. */
export function getRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}

/** Read the current request id, if any. Returns undefined outside a request. */
export function getRequestId(): string | undefined {
  return requestContextStorage.getStore()?.requestId;
}
