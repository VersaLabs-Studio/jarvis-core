// =============================================================================
// Tests for the request-scoped AsyncLocalStorage context (F2).
//
// Verifies the contract the rest of the observability stack depends on:
//   - Outside any context, getRequestContext/getRequestId return undefined
//     (background jobs, boot-time fetches).
//   - Inside a context, they return the current value.
//   - enterWith() is "leaky" (no exit) — the store persists for the
//     rest of the async chain. This is what we want for an inbound
//     HTTP request whose handler spawns many promises.
//   - run() is scoped (restores on exit).
// =============================================================================

import { describe, it, expect } from "vitest";
import { requestContextStorage, getRequestContext, getRequestId } from "../../src/lib/request-context.js";

describe("request-context (F2 — AsyncLocalStorage)", () => {
  it("returns undefined when no context is active", () => {
    expect(getRequestContext()).toBeUndefined();
    expect(getRequestId()).toBeUndefined();
  });

  it("returns the active context inside requestContextStorage.run()", () => {
    requestContextStorage.run({ requestId: "test-id-1", service: "api" }, () => {
      const ctx = getRequestContext();
      expect(ctx).toBeDefined();
      expect(ctx?.requestId).toBe("test-id-1");
      expect(ctx?.service).toBe("api");
      expect(getRequestId()).toBe("test-id-1");
    });
  });

  it("restores undefined after run() exits", () => {
    requestContextStorage.run({ requestId: "scoped", service: "api" }, () => {
      expect(getRequestId()).toBe("scoped");
    });
    expect(getRequestId()).toBeUndefined();
  });

  it("isolates run() scopes (nested run restores the outer)", () => {
    requestContextStorage.run({ requestId: "outer", service: "api" }, () => {
      expect(getRequestId()).toBe("outer");
      requestContextStorage.run({ requestId: "inner", service: "hermes" }, () => {
        expect(getRequestId()).toBe("inner");
        expect(getRequestContext()?.service).toBe("hermes");
      });
      expect(getRequestId()).toBe("outer");
      expect(getRequestContext()?.service).toBe("api");
    });
    expect(getRequestId()).toBeUndefined();
  });

  it("propagates the context through async boundaries", async () => {
    await requestContextStorage.run({ requestId: "async-id", service: "api" }, async () => {
      await new Promise((r) => setTimeout(r, 5));
      // Still in the context after awaiting a setTimeout.
      expect(getRequestId()).toBe("async-id");
      await Promise.resolve();
      expect(getRequestId()).toBe("async-id");
    });
  });

  it("getRequestId() is a thin alias for getRequestContext()?.requestId", () => {
    requestContextStorage.run({ requestId: "alias-test", service: "hermes" }, () => {
      expect(getRequestId()).toBe(getRequestContext()?.requestId);
      expect(getRequestId()).toBe("alias-test");
    });
  });
});
