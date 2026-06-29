// =============================================================================
// Tests for the Sentry (or GlitchTip) init + capture plugin (F2 — hermes).
//
// Mirrors `apps/api/tests/plugins/sentry.test.ts`. The contract is the
// same on both services: no-op when no DSN, init + captureException
// when a DSN is set. Uses the same `_resetSentryForTest()` test
// escape hatch as the api version to avoid vi.resetModules() (which
// would give the Sentry module a fresh requestContextStorage).
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { FastifyInstance } from "fastify";

const initMock = vi.fn();
const captureExceptionMock = vi.fn();
const addHookMock = vi.fn();

vi.mock("@sentry/node", () => ({
  init: (...args: unknown[]) => initMock(...args),
  captureException: (...args: unknown[]) => captureExceptionMock(...args),
}));

import { initSentry, isSentryEnabled, captureException, registerSentryHooks, _resetSentryForTest } from "../../src/plugins/sentry.js";
import { _resetEnvForTest } from "../../src/config/env.js";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  process.env = { ...ORIGINAL_ENV };
  process.env.OPENROUTER_API_KEY = "test-openrouter-key-1234567890";
  delete process.env.SENTRY_DSN;
  delete process.env.GLITCHTIP_DSN;
  _resetEnvForTest();
  _resetSentryForTest();
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
  process.removeAllListeners("uncaughtException");
  process.removeAllListeners("unhandledRejection");
  _resetSentryForTest();
});

describe("Sentry init (F2 — no-op when DSN unset)", () => {
  it("returns false when neither SENTRY_DSN nor GLITCHTIP_DSN is set", () => {
    const result = initSentry();
    expect(result).toBe(false);
    expect(isSentryEnabled()).toBe(false);
    expect(initMock).not.toHaveBeenCalled();
  });

  it("returns true and calls Sentry.init when SENTRY_DSN is set", () => {
    process.env.SENTRY_DSN = "https://test@sentry.example.com/123";
    const result = initSentry();
    expect(result).toBe(true);
    expect(isSentryEnabled()).toBe(true);
    expect(initMock).toHaveBeenCalledTimes(1);
    const initArgs = initMock.mock.calls[0]?.[0] as { dsn: string; environment: string; release: string };
    expect(initArgs.dsn).toBe("https://test@sentry.example.com/123");
    expect(initArgs.environment).toBeDefined();
    expect(initArgs.release).toBeDefined();
  });

  it("falls back to GLITCHTIP_DSN when SENTRY_DSN is unset", () => {
    process.env.GLITCHTIP_DSN = "https://test@glitchtip.example.com/123";
    initSentry();
    const initArgs = initMock.mock.calls[0]?.[0] as { dsn: string };
    expect(initArgs.dsn).toBe("https://test@glitchtip.example.com/123");
  });

  it("is idempotent — multiple initSentry() calls invoke Sentry.init() at most once", () => {
    process.env.SENTRY_DSN = "https://test@sentry.example.com/123";
    initSentry();
    initSentry();
    initSentry();
    expect(initMock).toHaveBeenCalledTimes(1);
  });
});

describe("captureException (F2 — no-op when not initialized)", () => {
  it("does nothing when Sentry is not initialized", () => {
    captureException(new Error("test"));
    expect(captureExceptionMock).not.toHaveBeenCalled();
  });

  it("forwards to Sentry.captureException when initialized", () => {
    process.env.SENTRY_DSN = "https://test@sentry.example.com/123";
    initSentry();
    const err = new Error("boom");
    captureException(err, { url: "/v1/chat/stream", method: "POST" });
    expect(captureExceptionMock).toHaveBeenCalledTimes(1);
    const args = captureExceptionMock.mock.calls[0];
    expect(args[0]).toBe(err);
    expect(args[1]).toEqual({
      tags: {},
      extra: { url: "/v1/chat/stream", method: "POST" },
    });
  });
});

describe("registerSentryHooks (F2 — Fastify onError capture)", () => {
  it("registers an onError hook when Sentry is enabled", () => {
    process.env.SENTRY_DSN = "https://test@sentry.example.com/123";
    initSentry();
    const fakeFastify = { addHook: addHookMock } as unknown as FastifyInstance;
    registerSentryHooks(fakeFastify);
    expect(addHookMock).toHaveBeenCalledWith("onError", expect.any(Function));
  });

  it("does NOT register a hook when Sentry is not initialized (no-op)", () => {
    const fakeFastify = { addHook: addHookMock } as unknown as FastifyInstance;
    registerSentryHooks(fakeFastify);
    expect(addHookMock).not.toHaveBeenCalled();
  });
});
