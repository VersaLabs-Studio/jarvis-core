// =============================================================================
// Tests for the request-scoped AsyncLocalStorage context (F2 — hermes).
//
// Mirrors `apps/api/tests/lib/request-context.test.ts` — the context
// is the same shape on both ends so a single X-Request-Id header
// correlates across the api→hermes boundary.
// =============================================================================

import { describe, it, expect } from "vitest";
import { requestContextStorage, getRequestContext, getRequestId } from "../../src/lib/request-context.js";

describe("request-context (F2 — AsyncLocalStorage)", () => {
  it("returns undefined when no context is active", () => {
    expect(getRequestContext()).toBeUndefined();
    expect(getRequestId()).toBeUndefined();
  });

  it("returns the active context inside requestContextStorage.run()", () => {
    requestContextStorage.run({ requestId: "hermes-id-1", service: "hermes" }, () => {
      const ctx = getRequestContext();
      expect(ctx).toBeDefined();
      expect(ctx?.requestId).toBe("hermes-id-1");
      expect(ctx?.service).toBe("hermes");
      expect(getRequestId()).toBe("hermes-id-1");
    });
  });

  it("restores undefined after run() exits", () => {
    requestContextStorage.run({ requestId: "scoped", service: "hermes" }, () => {
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
    await requestContextStorage.run({ requestId: "async-id", service: "hermes" }, async () => {
      await new Promise((r) => setTimeout(r, 5));
      expect(getRequestId()).toBe("async-id");
      await Promise.resolve();
      expect(getRequestId()).toBe("async-id");
    });
  });
});
