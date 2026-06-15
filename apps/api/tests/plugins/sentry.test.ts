// =============================================================================
// Tests for the Sentry (or GlitchTip) init + capture plugin (F2).
//
// The critical contract: the plugin is a complete no-op when neither
// SENTRY_DSN nor GLITCHTIP_DSN is set (the v1.5 default in dev). When
// a DSN is set, Sentry.init() is called and captureException goes
// through the SDK.
//
// We mock @sentry/node at the top of the file so the test never makes
// a real network call to the DSN. The Sentry module's `_initialized`
// flag is reset between tests via `_resetSentryForTest()` (a test-only
// escape hatch exported by the plugin) so each test runs against a
// fresh module state WITHOUT triggering vi.resetModules() (which would
// also give the Sentry module a fresh requestContextStorage, breaking
// the ALS-sharing contract).
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
import { _resetEnvForTest } from "../../src/lib/env.js";
import { requestContextStorage } from "../../src/lib/request-context.js";

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  vi.clearAllMocks();
  process.env = { ...ORIGINAL_ENV };
  // Required env for validateEnv() (called transitively by initSentry)
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_JWKS_URL = "https://example.supabase.co/auth/v1/.well-known/jwks.json";
  process.env.SUPABASE_ANON_KEY = "anon-test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-test";
  process.env.MASTER_ENCRYPTION_KEY = Buffer.from("test-key-32-bytes-long-for-aes!!").toString("base64");
  delete process.env.SENTRY_DSN;
  delete process.env.GLITCHTIP_DSN;
  // Reset the cached env + the Sentry module's _initialized flag.
  _resetEnvForTest();
  _resetSentryForTest();
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
  // Best-effort: tear down any process listeners the plugin attached.
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

  it("prefers SENTRY_DSN over GLITCHTIP_DSN when both are set", () => {
    process.env.SENTRY_DSN = "https://sentry";
    process.env.GLITCHTIP_DSN = "https://glitchtip";
    initSentry();
    const initArgs = initMock.mock.calls[0]?.[0] as { dsn: string };
    expect(initArgs.dsn).toBe("https://sentry");
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
  it("does nothing when Sentry is not initialized (DSN unset)", () => {
    captureException(new Error("test"));
    expect(captureExceptionMock).not.toHaveBeenCalled();
  });

  it("forwards to Sentry.captureException when initialized", () => {
    process.env.SENTRY_DSN = "https://test@sentry.example.com/123";
    initSentry();
    const err = new Error("boom");
    captureException(err, { url: "/v1/test", method: "GET" });
    expect(captureExceptionMock).toHaveBeenCalledTimes(1);
    const args = captureExceptionMock.mock.calls[0];
    expect(args[0]).toBe(err);
    expect(args[1]).toEqual({
      tags: {}, // no request context active in this test
      extra: { url: "/v1/test", method: "GET" },
    });
  });

  it("tags the event with request_id when a request context is active", async () => {
    process.env.SENTRY_DSN = "https://test@sentry.example.com/123";
    initSentry();
    await requestContextStorage.run({ requestId: "abc-123", service: "api" }, async () => {
      captureException(new Error("in-request"));
    });
    // The captureException reads the ALS that was set by the test's
    // requestContextStorage.run() — if Sentry is initialized AND the
    // store is set, the tags should include request_id.
    expect(captureExceptionMock).toHaveBeenCalledTimes(1);
    const args = captureExceptionMock.mock.calls[0];
    expect(args?.[1]).toMatchObject({ tags: { request_id: "abc-123" } });
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
